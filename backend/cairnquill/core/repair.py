"""
Cairnquill repair loop.

Sends failed claims back to Quill with the actual values so the LLM
can correct numeric assertions. Maximum 2 repair rounds; then ESCALATED.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from cairnquill.core.claims import (
    CairnquillClaim,
    Draft,
    Verdict,
    VerificationResult,
)

if TYPE_CHECKING:
    import snowflake.connector
    from cairnquill.quill.compile import QuillCompiler

logger = logging.getLogger(__name__)

MAX_REPAIR_ROUNDS = 2


def repair_draft(
    draft: Draft,
    verification: VerificationResult,
    compiler: "QuillCompiler",
    conn: "snowflake.connector.SnowflakeConnection",
    round_num: int = 1,
) -> tuple[Draft, VerificationResult]:
    """
    Attempt to repair failed claims by feeding actual values back to the LLM.

    Returns the updated draft and re-verification result.
    If round_num > MAX_REPAIR_ROUNDS, returns the same draft with ESCALATED
    flag set in the metadata (caller must handle status change).
    """
    from cairnquill.core.verify import verify_draft

    if round_num > MAX_REPAIR_ROUNDS:
        logger.warning(
            "draft=%s repairs exhausted after %d rounds – escalating",
            draft.draft_id,
            MAX_REPAIR_ROUNDS,
        )
        return draft, verification

    failed = [
        v for v in verification.verdicts
        if v.verdict in (Verdict.CONTRADICTED, Verdict.UNSUPPORTED)
    ]

    if not failed:
        logger.info("draft=%s no failed claims – nothing to repair", draft.draft_id)
        return draft, verification

    logger.info(
        "draft=%s repair round %d – %d failed claims",
        draft.draft_id,
        round_num,
        len(failed),
    )

    # Build repair context for each failed claim
    repair_hints: list[dict] = []
    for verdict in failed:
        original_claim = next(
            (c for c in draft.claims if c.claim_id == verdict.claim_id), None
        )
        if original_claim is None:
            continue
        repair_hints.append({
            "claim_id": verdict.claim_id,
            "type": original_claim.type.value,
            "text": original_claim.text,
            "asserted": verdict.asserted.model_dump() if verdict.asserted else None,
            "actual": verdict.actual.model_dump() if verdict.actual else None,
            "verdict": verdict.verdict.value,
        })

    # Ask Quill to regenerate only the failed claims
    try:
        repaired_claims = compiler.repair(
            case_id=draft.case_id,
            original_claims=draft.claims,
            repair_hints=repair_hints,
        )
    except Exception as exc:
        logger.exception("Quill repair failed for draft=%s", draft.draft_id)
        # Return as-is; caller should handle
        return draft, verification

    # Merge repaired claims back into the draft
    repaired_map = {c.claim_id: c for c in repaired_claims}
    merged_claims: list[CairnquillClaim] = []
    for claim in draft.claims:
        if claim.claim_id in repaired_map:
            merged_claims.append(repaired_map[claim.claim_id])
        else:
            merged_claims.append(claim)

    new_draft = Draft(
        draft_id=draft.draft_id,
        case_id=draft.case_id,
        version=draft.version + 1,
        claims=merged_claims,
        model=draft.model,
        prompt_version=draft.prompt_version,
        author=draft.author,
    )

    # Re-verify
    new_verification = verify_draft(new_draft, conn)

    logger.info(
        "draft=%s after repair round %d: blocked=%s, failed=%d",
        new_draft.draft_id,
        round_num,
        new_verification.blocked,
        len(new_verification.failed_verdicts),
    )

    return new_draft, new_verification
