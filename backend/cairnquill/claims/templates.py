"""
Cairnquill SQL templates for each claim type.

All templates run against EVIDENCE.CASE_ROWS (never RAW).
All values are passed as bind variables – no string interpolation.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from cairnquill.core.claims import CairnquillClaim


def get_template(
    claim: "CairnquillClaim", case_id: str
) -> tuple[str, tuple[Any, ...]]:
    """
    Return (sql, params) for the given claim type.

    The SQL uses %s placeholders for the Snowflake connector.
    All numeric comparisons are done in Python after fetching the result.
    """
    from cairnquill.core.claims import ClaimType

    txn_ids = claim.evidence_ids or []
    txn_ids_placeholder = ",".join(["%s"] * len(txn_ids)) if txn_ids else "NULL"

    handlers = {
        ClaimType.SUM_AMOUNT: _sum_amount,
        ClaimType.COUNT_TXNS: _count_txns,
        ClaimType.DISTINCT_COUNTERPARTIES: _distinct_counterparties,
        ClaimType.TIME_SPAN_HOURS: _time_span_hours,
        ClaimType.PATTERN_EXISTS: _pattern_exists,
        ClaimType.KYC_MISMATCH: _kyc_mismatch,
    }

    handler = handlers.get(claim.type)
    if handler is None:
        raise ValueError(f"No template for claim type: {claim.type}")

    return handler(claim, case_id, txn_ids, txn_ids_placeholder)


def _sum_amount(
    claim: "CairnquillClaim",
    case_id: str,
    txn_ids: list[int],
    ph: str,
) -> tuple[str, tuple]:
    """SUM(amt_paid) for the given txn_ids and currency within the snapshot."""
    currency = claim.currency
    if not currency:
        raise ValueError("SUM_AMOUNT requires a currency")
    sql = f"""
        SELECT COALESCE(SUM(amt_paid), 0)
        FROM EVIDENCE.CASE_ROWS
        WHERE case_id = %s
          AND paid_ccy = %s
          AND txn_id IN ({ph})
    """
    return sql.strip(), (case_id, currency, *txn_ids)


def _count_txns(
    claim: "CairnquillClaim",
    case_id: str,
    txn_ids: list[int],
    ph: str,
) -> tuple[str, tuple]:
    """COUNT(*) of distinct txn_ids in the snapshot."""
    sql = f"""
        SELECT COUNT(DISTINCT txn_id)
        FROM EVIDENCE.CASE_ROWS
        WHERE case_id = %s
          AND txn_id IN ({ph})
    """
    return sql.strip(), (case_id, *txn_ids)


def _distinct_counterparties(
    claim: "CairnquillClaim",
    case_id: str,
    txn_ids: list[int],
    ph: str,
) -> tuple[str, tuple]:
    """COUNT(DISTINCT dst) for the given txn_ids."""
    sql = f"""
        SELECT COUNT(DISTINCT dst)
        FROM EVIDENCE.CASE_ROWS
        WHERE case_id = %s
          AND txn_id IN ({ph})
    """
    return sql.strip(), (case_id, *txn_ids)


def _time_span_hours(
    claim: "CairnquillClaim",
    case_id: str,
    txn_ids: list[int],
    ph: str,
) -> tuple[str, tuple]:
    """DATEDIFF hours between MIN(ts) and MAX(ts) for the given txn_ids."""
    sql = f"""
        SELECT DATEDIFF('hour', MIN(ts), MAX(ts))
        FROM EVIDENCE.CASE_ROWS
        WHERE case_id = %s
          AND txn_id IN ({ph})
    """
    return sql.strip(), (case_id, *txn_ids)


def _pattern_exists(
    claim: "CairnquillClaim",
    case_id: str,
    txn_ids: list[int],
    ph: str,
) -> tuple[str, tuple]:
    """
    Returns the set of txn_ids present in the snapshot for this cairn.

    The verifier compares this frozenset against the evidence_ids in the claim.
    We return a CSV string here; the verifier converts to frozenset.
    """
    sql = f"""
        SELECT LISTAGG(DISTINCT txn_id::STRING, ',') WITHIN GROUP (ORDER BY txn_id)
        FROM EVIDENCE.CASE_ROWS
        WHERE case_id = %s
          AND txn_id IN ({ph})
    """
    return sql.strip(), (case_id, *txn_ids)


def _kyc_mismatch(
    claim: "CairnquillClaim",
    case_id: str,
    txn_ids: list[int],
    ph: str,
) -> tuple[str, tuple]:
    """
    Compare total inflow in the window to declared monthly income.

    Returns the ratio (inflow / monthly_income); asserted value is the ratio.
    Uses RAW.FX_RATES (illustrative) to convert to a common currency.
    KYC data is read from RAW.KYC with the masking policy applied.
    """
    account_key = claim.params.account_key or ""
    sql = f"""
        WITH inflow AS (
            SELECT COALESCE(SUM(cr.amt_received * COALESCE(fx.to_usd, 1)), 0) AS total_usd
            FROM EVIDENCE.CASE_ROWS cr
            LEFT JOIN RAW.FX_RATES fx ON fx.ccy = cr.recv_ccy
            WHERE cr.case_id = %s
              AND cr.txn_id IN ({ph})
        ),
        declared AS (
            SELECT declared_monthly_income * COALESCE(fx.to_usd, 1) AS monthly_usd
            FROM RAW.KYC k
            LEFT JOIN RAW.FX_RATES fx ON fx.ccy = k.income_ccy
            WHERE k.account_key = %s
        )
        SELECT CASE WHEN d.monthly_usd > 0 THEN i.total_usd / d.monthly_usd ELSE NULL END
        FROM inflow i, declared d
    """
    return sql.strip(), (case_id, *txn_ids, account_key)
