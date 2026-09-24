"""Filings router – list, view and replay sealed filings."""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException

from cairnquill.api.deps import CurrentRole, CurrentUser, SnowflakeConn, AppSettings
from cairnquill.adapters.snowflake import execute_query
from cairnquill.core.claims import CairnquillClaim, Draft, VerdictResult, Verdict, VerificationResult
from cairnquill.core.verify import verify_draft
from cairnquill.core.seal import replay_seal

logger = logging.getLogger(__name__)
router = APIRouter(tags=["filings"])


def _err(code: str, message: str) -> dict:
    return {"error": {"code": code, "message": message}}


@router.get("/filings")
async def list_filings(conn: SnowflakeConn, role: CurrentRole, limit: int = 50) -> dict:
    rows = execute_query(
        conn,
        """SELECT filing_id, case_id, draft_id, seal_sha, maker, approver,
                  approved_ts::STRING AS approved_ts
           FROM AUDIT.FILINGS ORDER BY approved_ts DESC LIMIT %s""",
        (limit,),
    )
    return {"filings": rows, "synthetic_data": True}


@router.get("/filings/{filing_id}")
async def get_filing(filing_id: str, conn: SnowflakeConn, role: CurrentRole) -> dict:
    filings = execute_query(conn, "SELECT * FROM AUDIT.FILINGS WHERE filing_id = %s", (filing_id,))
    if not filings:
        raise HTTPException(404, detail=_err("NOT_FOUND", f"Filing {filing_id} not found"))

    filing = filings[0]
    case_id = filing["CASE_ID"]
    draft_id = filing["DRAFT_ID"]

    drafts = execute_query(conn, "SELECT * FROM CASES.DRAFTS WHERE draft_id = %s", (draft_id,))
    verdicts = execute_query(conn, "SELECT * FROM CASES.VERDICTS WHERE draft_id = %s", (draft_id,))
    cairns = execute_query(conn, "SELECT * FROM EVIDENCE.CAIRNS WHERE case_id = %s", (case_id,))

    return {
        "filing": filing,
        "draft": drafts[0] if drafts else None,
        "verdicts": verdicts,
        "cairns": cairns,
        "synthetic_data": True,
    }


@router.post("/filings/{filing_id}/replay")
async def replay_filing(
    filing_id: str,
    conn: SnowflakeConn,
    role: CurrentRole,
    user: CurrentUser,
    settings: AppSettings,
) -> dict:
    """Reload stored claims and snapshot, re-verify, recompute seal, compare."""
    filings = execute_query(conn, "SELECT * FROM AUDIT.FILINGS WHERE filing_id = %s", (filing_id,))
    if not filings:
        raise HTTPException(404, detail=_err("NOT_FOUND", "Filing not found"))

    filing = filings[0]
    case_id = filing["CASE_ID"]
    draft_id = filing["DRAFT_ID"]
    expected_seal = filing["SEAL_SHA"]
    prev_seal = filing["PREV_SEAL_SHA"]

    drafts = execute_query(conn, "SELECT * FROM CASES.DRAFTS WHERE draft_id = %s", (draft_id,))
    if not drafts:
        raise HTTPException(404, detail=_err("NOT_FOUND", "Draft not found for replay"))

    d = drafts[0]
    claims_raw = json.loads(d["CLAIMS"]) if isinstance(d["CLAIMS"], str) else d["CLAIMS"]
    claims = [CairnquillClaim.model_validate(c) for c in claims_raw]
    draft = Draft(
        draft_id=draft_id, case_id=case_id, version=d["VERSION"],
        claims=claims, model=d["MODEL"], prompt_version=d["PROMPT_VERSION"], author=d["AUTHOR"],
    )

    case_rows = execute_query(conn, "SELECT * FROM EVIDENCE.CASE_ROWS WHERE case_id = %s", (case_id,))

    # Re-verify against the snapshot (does not regenerate LLM text)
    verification = verify_draft(draft, conn)

    versions = json.loads(filing["VERSIONS"]) if isinstance(filing["VERSIONS"], str) else dict(filing["VERSIONS"])

    match, computed = replay_seal(case_id, draft, case_rows, verification, versions, prev_seal, expected_seal)

    # Log the replay event
    execute_query(
        conn,
        "INSERT INTO AUDIT.EVENTS (case_id, actor, action, detail) VALUES (%s, %s, 'REPLAY', PARSE_JSON(%s))",
        (case_id, user, json.dumps({"filing_id": filing_id, "match": match, "computed": computed[:12]})),
    )

    if not match:
        logger.warning("Replay hash mismatch for filing=%s", filing_id)

    return {
        "filing_id": filing_id,
        "match": match,
        "expected_seal": expected_seal,
        "computed_seal": computed,
        "seal_prefix": computed[:12],
        "verification": verification.to_api_dict(),
        "tampered": not match,
    }
