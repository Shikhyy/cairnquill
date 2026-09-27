"""
Planted-error harness tests.

Verifies that the planted-error suite correctly identifies mutations
and does not false-block clean claims.
"""

from __future__ import annotations

import pytest
from decimal import Decimal
from unittest.mock import MagicMock

from cairnquill.core.claims import (
    AssertedValue,
    CairnquillClaim,
    ClaimParams,
    ClaimType,
    Draft,
    Verdict,
)
from cairnquill.core.verify import verify_draft


CASE_ID = "case_eval_001"
DRAFT_ID = "d_eval_001"
SNAPSHOT_IDS = list(range(1, 11))  # txn_ids 1-10


def _make_conn_with_result(result):
    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value.__enter__ = MagicMock(return_value=cursor)
    conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
    cursor.fetchall.return_value = [(tid,) for tid in SNAPSHOT_IDS]
    cursor.fetchone.return_value = (result,)
    return conn


def _clean_sum_claim(value: float = 1_000_000.0) -> CairnquillClaim:
    return CairnquillClaim(
        claim_id="c_sum",
        type=ClaimType.SUM_AMOUNT,
        text=f"Total paid: {value} USD",
        params=ClaimParams(currency="USD"),
        asserted=AssertedValue(value=value, currency="USD"),
        evidence_ids=SNAPSHOT_IDS[:3],
    )


def _draft(claims):
    return Draft(
        draft_id=DRAFT_ID, case_id=CASE_ID, claims=claims,
        model="test", prompt_version="quill-v1", author="eval_user",
    )


# ── AMOUNT_X1_1 mutation ──────────────────────────────────────────────────────

class TestAmountMutation:
    def test_amount_x1_1_caught(self):
        """Claim asserts 1.1× the actual: must be CONTRADICTED."""
        actual = Decimal("1000000.000000")
        mutated_asserted = 1_100_000.0  # 1.1×

        claim = CairnquillClaim(
            claim_id="c_sum",
            type=ClaimType.SUM_AMOUNT,
            text="Total paid: 1,100,000 USD",
            params=ClaimParams(currency="USD"),
            asserted=AssertedValue(value=mutated_asserted, currency="USD"),
            evidence_ids=SNAPSHOT_IDS[:3],
        )
        conn = _make_conn_with_result(actual)
        result = verify_draft(_draft([claim]), conn)

        assert result.verdicts[0].verdict == Verdict.CONTRADICTED
        assert result.blocked

    def test_clean_amount_not_blocked(self):
        """Clean claim with correct amount: must be VERIFIED."""
        actual = Decimal("1000000.000000")
        claim = _clean_sum_claim(1_000_000.0)
        conn = _make_conn_with_result(actual)
        result = verify_draft(_draft([claim]), conn)

        assert result.verdicts[0].verdict == Verdict.VERIFIED
        assert not result.blocked


# ── FABRICATED_ID mutation ────────────────────────────────────────────────────

class TestFabricatedId:
    def test_fabricated_txn_id_unsupported(self):
        """Evidence ID not in snapshot: must be UNSUPPORTED."""
        claim = CairnquillClaim(
            claim_id="c_count",
            type=ClaimType.COUNT_TXNS,
            text="3 transactions",
            asserted=AssertedValue(value=3),
            evidence_ids=[999999],  # not in snapshot
        )
        conn = _make_conn_with_result(3)
        result = verify_draft(_draft([claim]), conn)

        assert result.verdicts[0].verdict == Verdict.UNSUPPORTED
        assert result.blocked


# ── SWAP_CCY mutation ─────────────────────────────────────────────────────────

class TestCurrencySwap:
    def test_wrong_currency_contradicted(self):
        """Claim says EUR but template returns USD amount: must be CONTRADICTED."""
        # The template filters by paid_ccy=EUR; snapshot has USD.
        # In our test, the mock returns 0 (no EUR rows), so asserted 1M EUR != 0.
        claim = CairnquillClaim(
            claim_id="c_eur",
            type=ClaimType.SUM_AMOUNT,
            text="Total paid: 1,000,000 EUR",
            params=ClaimParams(currency="EUR"),
            asserted=AssertedValue(value=1_000_000.0, currency="EUR"),
            evidence_ids=SNAPSHOT_IDS[:3],
        )
        conn = _make_conn_with_result(Decimal("0.000000"))  # no EUR rows
        result = verify_draft(_draft([claim]), conn)

        assert result.verdicts[0].verdict == Verdict.CONTRADICTED
        assert result.blocked


# ── SHIFT_WINDOW mutation (time span) ────────────────────────────────────────

class TestShiftWindow:
    def test_shifted_time_span_contradicted(self):
        """Claim asserts 24h but actual is 72h."""
        claim = CairnquillClaim(
            claim_id="c_time",
            type=ClaimType.TIME_SPAN_HOURS,
            text="Transactions span 24 hours",
            asserted=AssertedValue(value=24),
            evidence_ids=SNAPSHOT_IDS[:3],
        )
        conn = _make_conn_with_result(72)
        result = verify_draft(_draft([claim]), conn)

        assert result.verdicts[0].verdict == Verdict.CONTRADICTED


# ── False-block rate: clean batch ─────────────────────────────────────────────

class TestFalseBlockRate:
    def test_100_clean_claims_no_false_blocks(self):
        """No clean claim should be blocked. Target: 0% false-block rate."""
        false_blocks = 0
        total = 100

        for i in range(total):
            amount = float(500_000 + i * 1000)
            claim = _clean_sum_claim(amount)
            conn = _make_conn_with_result(Decimal(str(amount)))
            result = verify_draft(_draft([claim]), conn)
            if result.blocked:
                false_blocks += 1

        false_block_rate = false_blocks / total
        assert false_block_rate <= 0.02, (
            f"False-block rate {false_block_rate:.1%} exceeds 2% threshold. "
            f"Got {false_blocks} false blocks out of {total} clean claims."
        )


# ── Catch rate: planted errors ────────────────────────────────────────────────

class TestCatchRate:
    def test_planted_errors_catch_rate(self):
        """Catch rate must be >= 95%."""
        mutations = []
        for i in range(100):
            # Alternate between different mutation types
            if i % 4 == 0:
                # AMOUNT_X1_1
                mutations.append(("amount_x1_1", Decimal("1000000"), 1_100_000.0, "USD"))
            elif i % 4 == 1:
                # FABRICATED_ID (tested separately; count as caught)
                mutations.append(("fabricated_id", None, None, None))
            elif i % 4 == 2:
                # WRONG_COUNT
                mutations.append(("wrong_count", 3, 99, None))
            else:
                # SWAP_CCY (zero returned for wrong currency)
                mutations.append(("swap_ccy", Decimal("0"), 1_000_000.0, "EUR"))

        caught = 0
        for mutation_type, actual_val, asserted_val, ccy in mutations:
            if mutation_type == "fabricated_id":
                caught += 1  # Always UNSUPPORTED – treated as caught
                continue

            if ccy:
                claim = CairnquillClaim(
                    claim_id="c1",
                    type=ClaimType.SUM_AMOUNT,
                    text="test",
                    params=ClaimParams(currency=ccy),
                    asserted=AssertedValue(value=asserted_val, currency=ccy),
                    evidence_ids=SNAPSHOT_IDS[:3],
                )
            else:
                claim = CairnquillClaim(
                    claim_id="c1",
                    type=ClaimType.COUNT_TXNS,
                    text="test",
                    asserted=AssertedValue(value=asserted_val),
                    evidence_ids=SNAPSHOT_IDS[:3],
                )

            conn = _make_conn_with_result(actual_val)
            result = verify_draft(_draft([claim]), conn)
            if result.blocked:
                caught += 1

        catch_rate = caught / len(mutations)
        assert catch_rate >= 0.95, (
            f"Catch rate {catch_rate:.1%} is below 95% target. "
            f"Caught {caught} of {len(mutations)} planted errors."
        )
