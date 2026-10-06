"""
Cairnquill core verifier (Surveyor).

Runs deterministic SQL templates against EVIDENCE.CASE_ROWS only (never RAW).
Numbers are never judged by an LLM.

Rules:
- Bind variables for all SQL parameters.
- SUM_AMOUNT uses a 0.01 absolute tolerance.
- COUNT_TXNS, DISTINCT_COUNTERPARTIES, TIME_SPAN_HOURS: exact.
- PATTERN_EXISTS: re-runs the cairn query and compares the row set.
- KYC_MISMATCH: inflow vs declared income via FX_RATES.
- JUDGEMENT: always returns Verdict.JUDGEMENT without SQL.
- Any evidence_id not in the snapshot returns Verdict.UNSUPPORTED.
"""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import TYPE_CHECKING

from cairnquill.core.claims import (
    CairnquillClaim,
    ClaimType,
    Draft,
    Verdict,
    VerdictResult,
    VerificationResult,
)
from cairnquill.claims.templates import get_template

if TYPE_CHECKING:
    import snowflake.connector

logger = logging.getLogger(__name__)

# Tolerance for SUM_AMOUNT comparisons
_SUM_TOLERANCE = Decimal("0.01")

# Required facts per pattern type for the recall check
_REQUIRED_FACTS: dict[str, list[str]] = {
    "CYCLE": ["sum_amount", "time_span_hours", "pattern_exists"],
    "FAN_OUT": ["sum_amount", "distinct_counterparties", "time_span_hours"],
    "FAN_IN": ["sum_amount", "distinct_counterparties", "time_span_hours"],
}


def _snapshot_txn_ids(
    cursor: "snowflake.connector.cursor.SnowflakeCursor",
    case_id: str,
) -> frozenset[int]:
    """Return the set of txn_ids in the case snapshot."""
    cursor.execute(
        "SELECT DISTINCT txn_id FROM EVIDENCE.CASE_ROWS WHERE case_id = %s",
        (case_id,),
    )
    return frozenset(row[0] for row in cursor.fetchall())


def _run_template(
    cursor: "snowflake.connector.cursor.SnowflakeCursor",
    claim: CairnquillClaim,
    case_id: str,
) -> Decimal | int | bool | frozenset[int]:
    """Execute the SQL template for a claim type. Bind variables only."""
    sql, params = get_template(claim, case_id)
    cursor.execute(sql, params)
    row = cursor.fetchone()
    if row is None:
        return None  # type: ignore[return-value]
    value = row[0]
    if isinstance(value, float):
        return Decimal(str(value))
    return value


def _within_tolerance(
    claim_type: ClaimType,
    actual: Decimal | int | bool | frozenset[int],
    asserted_value: float | str | int | frozenset[int],
) -> bool:
    """True if actual is within tolerance of the asserted value."""
    if claim_type == ClaimType.SUM_AMOUNT:
        try:
            a = Decimal(str(asserted_value))
            b = Decimal(str(actual))
            return abs(a - b) <= _SUM_TOLERANCE
        except Exception:
            return False

    if claim_type == ClaimType.PATTERN_EXISTS:
        def _to_frozenset(v: Any) -> frozenset[int]:
            if isinstance(v, (set, frozenset)):
                return frozenset(int(x) for x in v)
            if isinstance(v, (list, tuple)):
                return frozenset(int(x) for x in v)
            if isinstance(v, str):
                return frozenset(int(x.strip()) for x in v.split(",") if x.strip().isdigit())
            return frozenset()

        return _to_frozenset(actual) == _to_frozenset(asserted_value)

    # Exact for COUNT_TXNS, DISTINCT_COUNTERPARTIES, TIME_SPAN_HOURS, KYC_MISMATCH
    try:
        return int(actual) == int(asserted_value)  # type: ignore[arg-type]
    except Exception:
        return str(actual) == str(asserted_value)


def verify_draft(
    draft: Draft,
    conn: "snowflake.connector.SnowflakeConnection",
) -> VerificationResult:
    """
    Verify all claims in a draft against the case snapshot.

    Returns a VerificationResult with per-claim verdicts.
    Blocked is True if any claim is CONTRADICTED or UNSUPPORTED.
    """
    verdicts: list[VerdictResult] = []

    with conn.cursor() as cursor:
        snapshot_ids = _snapshot_txn_ids(cursor, draft.case_id)

        for claim in draft.claims:
            # JUDGEMENT: label and skip SQL
            if not claim.is_verifiable:
                verdicts.append(VerdictResult(claim_id=claim.claim_id, verdict=Verdict.JUDGEMENT))
                continue

            # Unsupported: any evidence_id not in snapshot
            missing = [eid for eid in claim.evidence_ids if eid not in snapshot_ids]
            if missing:
                logger.info(
                    "claim=%s UNSUPPORTED: evidence_ids %s not in snapshot",
                    claim.claim_id,
                    missing,
                )
                verdicts.append(
                    VerdictResult(
                        claim_id=claim.claim_id,
                        verdict=Verdict.UNSUPPORTED,
                        error=f"Evidence IDs not in snapshot: {missing}",
                    )
                )
                continue

            # Run the SQL template
            try:
                actual = _run_template(cursor, claim, draft.case_id)
            except Exception as exc:
                logger.exception("Template error for claim=%s", claim.claim_id)
                verdicts.append(
                    VerdictResult(
                        claim_id=claim.claim_id,
                        verdict=Verdict.UNSUPPORTED,
                        error=str(exc),
                    )
                )
                continue

            if actual is None:
                verdicts.append(
                    VerdictResult(
                        claim_id=claim.claim_id,
                        verdict=Verdict.UNSUPPORTED,
                        error="Query returned no rows",
                    )
                )
                continue

            # Compare actual vs asserted
            asserted_value = claim.asserted.value if claim.asserted else None
            if asserted_value is None:
                verdicts.append(
                    VerdictResult(
                        claim_id=claim.claim_id,
                        verdict=Verdict.UNSUPPORTED,
                        error="No asserted value in claim",
                    )
                )
                continue

            matched = _within_tolerance(claim.type, actual, asserted_value)

            tolerance = float(_SUM_TOLERANCE) if claim.type == ClaimType.SUM_AMOUNT else None

            if matched:
                verdicts.append(
                    VerdictResult(
                        claim_id=claim.claim_id,
                        verdict=Verdict.VERIFIED,
                        asserted=claim.asserted,
                        actual=type(claim.asserted)(value=actual),  # type: ignore[call-arg]
                        tolerance_used=tolerance,
                    )
                )
            else:
                logger.warning(
                    "claim=%s CONTRADICTED: asserted=%s actual=%s",
                    claim.claim_id,
                    asserted_value,
                    actual,
                )
                from cairnquill.core.claims import AssertedValue
                verdicts.append(
                    VerdictResult(
                        claim_id=claim.claim_id,
                        verdict=Verdict.CONTRADICTED,
                        asserted=claim.asserted,
                        actual=AssertedValue(
                            value=float(actual) if isinstance(actual, Decimal) else actual,
                            currency=claim.currency,
                        ),
                        tolerance_used=tolerance,
                    )
                )

    blocked = any(
        v.verdict in (Verdict.CONTRADICTED, Verdict.UNSUPPORTED) for v in verdicts
    )

    # Recall check: flag missing required facts for the case's typology
    omissions = _recall_check(draft, verdicts)

    return VerificationResult(
        case_id=draft.case_id,
        draft_id=draft.draft_id,
        blocked=blocked,
        verdicts=verdicts,
        omissions=omissions,
    )


def _recall_check(draft: Draft, verdicts: list[VerdictResult]) -> list[str]:
    """
    Return a list of vital facts that are missing from the draft.

    Omissions are informational – they do not block submission.
    """
    # Determine typology from claim types present
    present_types = {c.type.value.lower() for c in draft.claims if c.is_verifiable}
    omissions = []

    if "pattern_exists" not in present_types:
        omissions.append("pattern_exists")
    if "sum_amount" not in present_types:
        omissions.append("sum_amount")
    if "time_span_hours" not in present_types:
        omissions.append("time_span_hours")

    return omissions
