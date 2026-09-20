"""Demo mode router – inject errors and restore. Demo mode only."""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from cairnquill.api.deps import CurrentRole, SnowflakeConn, AppSettings
from cairnquill.adapters.snowflake import execute_query

logger = logging.getLogger(__name__)
router = APIRouter(tags=["demo"])


def _err(code: str, message: str) -> dict:
    return {"error": {"code": code, "message": message}}


class InjectErrorRequest(BaseModel):
    draft_id: str
    claim_id: str
    mutation: str = "AMOUNT_X1_1"  # AMOUNT_X1_1 | WRONG_ACCOUNT | SWAP_CCY


@router.post("/demo/inject-error")
async def inject_error(
    body: InjectErrorRequest,
    conn: SnowflakeConn,
    role: CurrentRole,
    settings: AppSettings,
) -> dict:
    """
    Mutate one claim for demo purposes (never persisted to a filing).
    Only available when DEMO_MODE=true.
    """
    if not settings.demo_mode:
        raise HTTPException(403, detail=_err("FORBIDDEN", "Demo mode is disabled"))

    if role not in ("dev", "auditor", "investigator"):
        raise HTTPException(403, detail=_err("FORBIDDEN", "Not allowed"))

    # Fetch the draft
    drafts = execute_query(
        conn,
        "SELECT claims FROM CASES.DRAFTS WHERE draft_id = %s",
        (body.draft_id,),
    )
    if not drafts:
        raise HTTPException(404, detail=_err("NOT_FOUND", "Draft not found"))

    claims_raw = json.loads(drafts[0]["CLAIMS"]) if isinstance(drafts[0]["CLAIMS"], str) else drafts[0]["CLAIMS"]

    mutated_claim = None
    for claim in claims_raw:
        if claim.get("claim_id") == body.claim_id:
            mutated_claim = dict(claim)
            break

    if mutated_claim is None:
        raise HTTPException(404, detail=_err("NOT_FOUND", "Claim not found"))

    # Apply mutation (in-memory only)
    original_value = None
    if body.mutation == "AMOUNT_X1_1" and mutated_claim.get("asserted"):
        original_value = mutated_claim["asserted"].get("value")
        if isinstance(original_value, (int, float)):
            mutated_claim["asserted"]["value"] = round(original_value * 1.1, 2)

    elif body.mutation == "SWAP_CCY" and mutated_claim.get("asserted"):
        ccy = mutated_claim["asserted"].get("currency", "USD")
        mutated_claim["asserted"]["currency"] = "EUR" if ccy == "USD" else "USD"

    logger.info(
        "Demo inject-error: draft=%s claim=%s mutation=%s",
        body.draft_id, body.claim_id, body.mutation,
    )

    return {
        "draft_id": body.draft_id,
        "claim_id": body.claim_id,
        "mutation": body.mutation,
        "mutated_claim": mutated_claim,
        "original_value": original_value,
        "note": "This mutation is not persisted. Use verify endpoint with this claim to see CONTRADICTED.",
    }


@router.post("/demo/restore")
async def restore(draft_id: str, conn: SnowflakeConn, settings: AppSettings) -> dict:
    """No-op restore – mutations from inject-error are never persisted."""
    if not settings.demo_mode:
        raise HTTPException(403, detail=_err("FORBIDDEN", "Demo mode is disabled"))
    return {"draft_id": draft_id, "restored": True}
