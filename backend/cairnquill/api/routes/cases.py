"""
Cases router – the main workflow: create, mine, draft, verify, repair, submit, approve.

All state transitions are enforced here (not only in the UI).
Every write logs an event to AUDIT.EVENTS.
"""

from __future__ import annotations

import json
import uuid
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from cairnquill.api.deps import CurrentRole, CurrentUser, SnowflakeConn, AppSettings
from cairnquill.adapters.snowflake import execute_query, execute_scalar
from cairnquill.core.claims import Draft, CairnquillClaim
from cairnquill.core.verify import verify_draft
from cairnquill.core.repair import repair_draft, MAX_REPAIR_ROUNDS
from cairnquill.core.seal import seal

logger = logging.getLogger(__name__)
router = APIRouter(tags=["cases"])

# Valid case status transitions
_TRANSITIONS: dict[str, list[str]] = {
    "NEW":       ["MINED"],
    "MINED":     ["DRAFTED"],
    "DRAFTED":   ["BLOCKED", "READY"],
    "BLOCKED":   ["DRAFTED", "ESCALATED"],
    "ESCALATED": ["DRAFTED"],
    "READY":     ["SUBMITTED"],
    "SUBMITTED": ["APPROVED", "DRAFTED"],
    "APPROVED":  ["SEALED"],
}


def _err(code: str, message: str, hint: str = "") -> dict:
    return {"error": {"code": code, "message": message, "hint": hint}}


def _log_event(conn: Any, case_id: str, actor: str, action: str, detail: dict) -> None:
    execute_query(
        conn,
        "INSERT INTO AUDIT.EVENTS (case_id, actor, action, detail) VALUES (%s, %s, %s, PARSE_JSON(%s))",
        (case_id, actor, action, json.dumps(detail, default=str)),
    )


def _get_case(conn: Any, case_id: str) -> dict:
    rows = execute_query(
        conn,
        "SELECT * FROM CASES.CASES WHERE case_id = %s",
        (case_id,),
    )
    if not rows:
        raise HTTPException(status_code=404, detail=_err("NOT_FOUND", f"Case {case_id} not found"))
    return rows[0]


# ── Create case ────────────────────────────────────────────────────────────────

class CreateCaseRequest(BaseModel):
    alert_id: int


@router.post("/cases", status_code=201)
async def create_case(
    body: CreateCaseRequest,
    conn: SnowflakeConn,
    role: CurrentRole,
    user: CurrentUser,
) -> dict:
    if role not in ("investigator", "dev"):
        raise HTTPException(403, detail=_err("FORBIDDEN", "Only investigators can create cases"))

    # Get the alert
    alerts = execute_query(
        conn,
        "SELECT * FROM CASES.ALERTS WHERE alert_id = %s AND status = 'OPEN'",
        (body.alert_id,),
    )
    if not alerts:
        raise HTTPException(404, detail=_err("NOT_FOUND", "Alert not found or already closed"))

    alert = alerts[0]
    case_id = f"case_{uuid.uuid4().hex[:8]}"

    execute_query(
        conn,
        """INSERT INTO CASES.CASES (case_id, alert_id, account_key, status, maker, sla_due)
           VALUES (%s, %s, %s, 'NEW', %s, %s)""",
        (case_id, body.alert_id, alert["ACCOUNT_KEY"], user, alert["SLA_DUE"]),
    )
    _log_event(conn, case_id, user, "CREATE", {"alert_id": body.alert_id})
    return {"case_id": case_id, "status": "NEW"}


# ── Get case ──────────────────────────────────────────────────────────────────

@router.get("/cases/{case_id}")
async def get_case(
    case_id: str,
    conn: SnowflakeConn,
    role: CurrentRole,
) -> dict:
    case = _get_case(conn, case_id)

    # Get cairns
    cairns = execute_query(
        conn,
        "SELECT cairn_id, pattern_type, summary, created_ts::STRING AS created_ts FROM EVIDENCE.CAIRNS WHERE case_id = %s",
        (case_id,),
    )

    # Get KYC (masked for auditor)
    account_key = case.get("ACCOUNT_KEY", "")
    kyc = execute_query(
        conn,
        "SELECT * FROM RAW.KYC WHERE account_key = %s",
        (account_key,),
    )

    return {
        "case": case,
        "cairns": cairns,
        "kyc": kyc[0] if kyc else None,
        "synthetic_data": True,
    }


# ── Mine evidence ──────────────────────────────────────────────────────────────

@router.post("/cases/{case_id}/mine")
async def mine_evidence(
    case_id: str,
    conn: SnowflakeConn,
    role: CurrentRole,
    user: CurrentUser,
    window_hours: int = 168,
) -> dict:
    if role not in ("investigator", "dev"):
        raise HTTPException(403, detail=_err("FORBIDDEN", "Investigators only"))

    case = _get_case(conn, case_id)
    if case["STATUS"] not in ("NEW",):
        raise HTTPException(409, detail=_err("STATE_INVALID", f"Cannot mine in status {case['STATUS']}"))

    account_key = case["ACCOUNT_KEY"]

    # Call the stored procedure
    result = execute_scalar(
        conn,
        "CALL EVIDENCE.MINE_EVIDENCE(%s, %s, %s)",
        (case_id, account_key, window_hours),
    )

    # Update case status
    execute_query(conn, "UPDATE CASES.CASES SET status='MINED', updated_ts=CURRENT_TIMESTAMP() WHERE case_id=%s", (case_id,))
    _log_event(conn, case_id, user, "MINE", {"window_hours": window_hours, "result": result})

    return {"case_id": case_id, "status": "MINED", "result": result}


# ── Draft ──────────────────────────────────────────────────────────────────────

@router.post("/cases/{case_id}/draft")
async def create_draft(
    case_id: str,
    conn: SnowflakeConn,
    role: CurrentRole,
    user: CurrentUser,
    settings: AppSettings,
) -> dict:
    if role not in ("investigator", "dev"):
        raise HTTPException(403, detail=_err("FORBIDDEN", "Investigators only"))

    case = _get_case(conn, case_id)
    if case["STATUS"] not in ("MINED", "ESCALATED", "BLOCKED"):
        raise HTTPException(409, detail=_err("STATE_INVALID", f"Cannot draft in status {case['STATUS']}"))

    # Load evidence
    cairns = execute_query(conn, "SELECT * FROM EVIDENCE.CAIRNS WHERE case_id = %s", (case_id,))
    case_rows = execute_query(conn, "SELECT * FROM EVIDENCE.CASE_ROWS WHERE case_id = %s", (case_id,))
    kyc_rows = execute_query(conn, "SELECT * FROM RAW.KYC WHERE account_key = %s", (case["ACCOUNT_KEY"],))
    kyc = kyc_rows[0] if kyc_rows else None

    if not cairns:
        raise HTTPException(422, detail=_err("SNAPSHOT_MISSING", "No evidence found for this case"))

    from cairnquill.quill.compile import QuillCompiler
    compiler = QuillCompiler(conn, settings.cortex_model, settings.prompt_version)

    try:
        claims = compiler.compile(case_id, cairns, case_rows, kyc)
    except ValueError as exc:
        if "LLM_INVALID_JSON" in str(exc):
            raise HTTPException(422, detail=_err("LLM_INVALID_JSON", str(exc)))
        raise

    draft_id = f"d_{uuid.uuid4().hex[:8]}"
    draft = Draft(
        draft_id=draft_id,
        case_id=case_id,
        claims=claims,
        model=settings.cortex_model,
        prompt_version=settings.prompt_version,
        author=user,
    )

    # Persist draft
    execute_query(
        conn,
        "INSERT INTO CASES.DRAFTS (draft_id, case_id, version, claims, model, prompt_version, author) VALUES (%s, %s, %s, PARSE_JSON(%s), %s, %s, %s)",
        (draft_id, case_id, 1, json.dumps([c.model_dump(exclude_none=True) for c in claims], default=str), settings.cortex_model, settings.prompt_version, user),
    )

    # Auto-verify
    verification = verify_draft(draft, conn)
    new_status = "BLOCKED" if verification.blocked else "READY"

    # Persist verdicts
    for v in verification.verdicts:
        execute_query(
            conn,
            "INSERT INTO CASES.VERDICTS (draft_id, claim_id, verdict, asserted, actual) VALUES (%s, %s, %s, PARSE_JSON(%s), PARSE_JSON(%s))",
            (draft_id, v.claim_id, v.verdict.value,
             json.dumps(v.asserted.model_dump() if v.asserted else None, default=str),
             json.dumps(v.actual.model_dump() if v.actual else None, default=str)),
        )

    execute_query(conn, "UPDATE CASES.CASES SET status=%s, updated_ts=CURRENT_TIMESTAMP() WHERE case_id=%s", (new_status, case_id))
    _log_event(conn, case_id, user, "DRAFT", {"draft_id": draft_id, "blocked": verification.blocked})

    return verification.to_api_dict() | {"draft_id": draft_id, "status": new_status, "claims": [c.model_dump() for c in draft.claims]}


# ── Verify ────────────────────────────────────────────────────────────────────

@router.post("/cases/{case_id}/verify")
async def verify_case(
    case_id: str,
    conn: SnowflakeConn,
    role: CurrentRole,
    user: CurrentUser,
) -> dict:
    case = _get_case(conn, case_id)
    drafts = execute_query(
        conn,
        "SELECT * FROM CASES.DRAFTS WHERE case_id = %s ORDER BY version DESC LIMIT 1",
        (case_id,),
    )
    if not drafts:
        raise HTTPException(404, detail=_err("NOT_FOUND", "No draft found"))

    d = drafts[0]
    claims_raw = json.loads(d["CLAIMS"]) if isinstance(d["CLAIMS"], str) else d["CLAIMS"]
    claims = [CairnquillClaim.model_validate(c) for c in claims_raw]
    draft = Draft(
        draft_id=d["DRAFT_ID"], case_id=case_id, version=d["VERSION"],
        claims=claims, model=d["MODEL"], prompt_version=d["PROMPT_VERSION"], author=d["AUTHOR"],
    )

    verification = verify_draft(draft, conn)
    new_status = "BLOCKED" if verification.blocked else "READY"
    execute_query(conn, "UPDATE CASES.CASES SET status=%s, updated_ts=CURRENT_TIMESTAMP() WHERE case_id=%s", (new_status, case_id))
    _log_event(conn, case_id, user, "VERIFY", {"blocked": verification.blocked})

    return verification.to_api_dict() | {"claims": [c.model_dump() for c in draft.claims]}


# ── Submit ────────────────────────────────────────────────────────────────────

@router.post("/cases/{case_id}/submit")
async def submit_case(
    case_id: str,
    conn: SnowflakeConn,
    role: CurrentRole,
    user: CurrentUser,
) -> dict:
    if role not in ("investigator", "dev"):
        raise HTTPException(403, detail=_err("FORBIDDEN", "Investigators only"))

    case = _get_case(conn, case_id)
    if case["STATUS"] != "READY":
        raise HTTPException(
            409,
            detail=_err(
                "DRAFT_BLOCKED" if case["STATUS"] == "BLOCKED" else "STATE_INVALID",
                "Draft blocked. One or more claims don't match the data. Review or repair claims.",
            ),
        )

    execute_query(conn, "UPDATE CASES.CASES SET status='SUBMITTED', updated_ts=CURRENT_TIMESTAMP() WHERE case_id=%s", (case_id,))
    _log_event(conn, case_id, user, "SUBMIT", {})
    return {"case_id": case_id, "status": "SUBMITTED"}


# ── Approve ───────────────────────────────────────────────────────────────────

@router.post("/cases/{case_id}/approve")
async def approve_case(
    case_id: str,
    conn: SnowflakeConn,
    role: CurrentRole,
    user: CurrentUser,
    settings: AppSettings,
) -> dict:
    if role not in ("approver", "dev"):
        raise HTTPException(403, detail=_err("FORBIDDEN", "Approvers only"))

    case = _get_case(conn, case_id)
    if case["STATUS"] != "SUBMITTED":
        raise HTTPException(409, detail=_err("STATE_INVALID", f"Cannot approve in status {case['STATUS']}"))

    # Maker-checker: cannot approve own draft
    if case["MAKER"] == user:
        raise HTTPException(
            403,
            detail=_err("SELF_APPROVAL", "A different person must approve this draft."),
        )

    # Get draft and evidence
    drafts = execute_query(conn, "SELECT * FROM CASES.DRAFTS WHERE case_id=%s ORDER BY version DESC LIMIT 1", (case_id,))
    case_rows = execute_query(conn, "SELECT * FROM EVIDENCE.CASE_ROWS WHERE case_id=%s", (case_id,))
    verdicts_rows = execute_query(conn, "SELECT * FROM CASES.VERDICTS WHERE draft_id=%s", (drafts[0]["DRAFT_ID"],))

    d = drafts[0]
    claims_raw = json.loads(d["CLAIMS"]) if isinstance(d["CLAIMS"], str) else d["CLAIMS"]
    claims = [CairnquillClaim.model_validate(c) for c in claims_raw]
    draft = Draft(
        draft_id=d["DRAFT_ID"], case_id=case_id, version=d["VERSION"],
        claims=claims, model=d["MODEL"], prompt_version=d["PROMPT_VERSION"], author=d["AUTHOR"],
    )

    from cairnquill.core.claims import VerdictResult, Verdict
    verdicts = [
        VerdictResult(claim_id=v["CLAIM_ID"], verdict=Verdict(v["VERDICT"]))
        for v in verdicts_rows
    ]
    from cairnquill.core.claims import VerificationResult
    verification = VerificationResult(
        case_id=case_id, draft_id=d["DRAFT_ID"],
        blocked=False, verdicts=verdicts,
    )

    # Get previous seal
    prev_filing = execute_query(
        conn,
        "SELECT seal_sha FROM AUDIT.FILINGS ORDER BY approved_ts DESC LIMIT 1",
        (),
    )
    prev_seal = prev_filing[0]["SEAL_SHA"] if prev_filing else None

    versions = {
        "model": d["MODEL"],
        "prompt": d["PROMPT_VERSION"],
        "verifier": settings.verifier_version,
        "detector": "CQ_DETECTOR_v1",
    }

    seal_sha = seal(case_id, draft, case_rows, verification, versions, prev_seal)
    filing_id = f"filing_{uuid.uuid4().hex[:8]}"

    from cairnquill.core.seal import _evidence_sha
    row_shas = [r.get("ROW_SHA", "") for r in case_rows]
    evidence_sha_val = _evidence_sha(row_shas)

    execute_query(
        conn,
        """INSERT INTO AUDIT.FILINGS (filing_id, case_id, draft_id, evidence_sha, seal_sha, prev_seal_sha, versions, maker, approver, approved_ts)
           VALUES (%s, %s, %s, %s, %s, %s, PARSE_JSON(%s), %s, %s, CURRENT_TIMESTAMP())""",
        (filing_id, case_id, d["DRAFT_ID"], evidence_sha_val, seal_sha, prev_seal,
         json.dumps(versions), case["MAKER"], user),
    )

    execute_query(conn, "UPDATE CASES.CASES SET status='SEALED', updated_ts=CURRENT_TIMESTAMP() WHERE case_id=%s", (case_id,))
    _log_event(conn, case_id, user, "APPROVE", {"filing_id": filing_id, "seal_sha": seal_sha[:12]})

    return {"case_id": case_id, "filing_id": filing_id, "seal_sha": seal_sha, "status": "SEALED"}


# ── Reject ────────────────────────────────────────────────────────────────────

class RejectRequest(BaseModel):
    comment: str


@router.post("/cases/{case_id}/reject")
async def reject_case(
    case_id: str,
    body: RejectRequest,
    conn: SnowflakeConn,
    role: CurrentRole,
    user: CurrentUser,
) -> dict:
    if role not in ("approver", "dev"):
        raise HTTPException(403, detail=_err("FORBIDDEN", "Approvers only"))

    case = _get_case(conn, case_id)
    if case["STATUS"] != "SUBMITTED":
        raise HTTPException(409, detail=_err("STATE_INVALID", "Can only reject SUBMITTED cases"))

    execute_query(
        conn,
        "INSERT INTO CASES.COMMENTS (case_id, author, body) VALUES (%s, %s, %s)",
        (case_id, user, body.comment),
    )
    execute_query(conn, "UPDATE CASES.CASES SET status='DRAFTED', updated_ts=CURRENT_TIMESTAMP() WHERE case_id=%s", (case_id,))
    _log_event(conn, case_id, user, "REJECT", {"comment": body.comment[:100]})

    return {"case_id": case_id, "status": "DRAFTED", "comment": body.comment}
