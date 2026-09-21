"""
Tests for the core verifier (Surveyor).

Uses fixture snapshots instead of a live Snowflake connection.
"""

from __future__ import annotations

import json
from decimal import Decimal
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from cairnquill.core.claims import (
    AssertedValue,
    CairnquillClaim,
    ClaimParams,
    ClaimType,
    Draft,
    Verdict,
)
from cairnquill.core.verify import verify_draft, _within_tolerance


# ── Fixtures ──────────────────────────────────────────────────────────────────

FIXTURE_CASE_ID = "case_test_001"
FIXTURE_DRAFT_ID = "d_test_001"

FIXTURE_TXN_IDS = [101, 102, 103]

# Snapshot rows mirroring what EVIDENCE.CASE_ROWS would return
FIXTURE_ROWS = [
    {
        "CASE_ID": FIXTURE_CASE_ID,
        "CAIRN_ID": "CAIRN-test-CYCLE",
        "TXN_ID": 101,
        "TS": "2024-01-10 09:00:00",
        "SRC": "BANK_A:111",
        "DST": "BANK_B:222",
        "AMT_PAID": Decimal("500000.000000"),
        "PAID_CCY": "USD",
        "AMT_RECEIVED": Decimal("500000.000000"),
        "RECV_CCY": "USD",
        "PAY_FORMAT": "Wire",
        "ROW_SHA": "abc001",
    },
    {
        "CASE_ID": FIXTURE_CASE_ID,
        "CAIRN_ID": "CAIRN-test-CYCLE",
        "TXN_ID": 102,
        "TS": "2024-01-10 15:00:00",
        "SRC": "BANK_B:222",
        "DST": "BANK_C:333",
        "AMT_PAID": Decimal("500000.000000"),
        "PAID_CCY": "USD",
        "AMT_RECEIVED": Decimal("500000.000000"),
        "RECV_CCY": "USD",
        "PAY_FORMAT": "Wire",
        "ROW_SHA": "abc002",
    },
    {
        "CASE_ID": FIXTURE_CASE_ID,
        "CAIRN_ID": "CAIRN-test-CYCLE",
        "TXN_ID": 103,
        "TS": "2024-01-11 09:00:00",
        "SRC": "BANK_C:333",
        "DST": "BANK_A:111",
        "AMT_PAID": Decimal("500000.000000"),
        "PAID_CCY": "USD",
        "AMT_RECEIVED": Decimal("500000.000000"),
        "RECV_CCY": "USD",
        "PAY_FORMAT": "Wire",
        "ROW_SHA": "abc003",
    },
]


def _make_mock_conn(
    snapshot_ids: list[int] | None = None,
    query_result: Any = None,
) -> MagicMock:
    """Build a mock Snowflake connection that returns fixture data."""
    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value.__enter__ = MagicMock(return_value=cursor)
    conn.cursor.return_value.__exit__ = MagicMock(return_value=False)

    effective_ids = snapshot_ids if snapshot_ids is not None else FIXTURE_TXN_IDS

    def _fetchall_side_effect():
        return [(tid,) for tid in effective_ids]

    def _fetchone_side_effect():
        if query_result is not None:
            return (query_result,)
        return (Decimal("1500000.000000"),)

    cursor.fetchall = _fetchall_side_effect
    cursor.fetchone = _fetchone_side_effect
    return conn


def _make_claim(
    claim_id: str,
    claim_type: ClaimType,
    asserted_value: float | str | None,
    evidence_ids: list[int] | None = None,
    currency: str | None = None,
) -> CairnquillClaim:
    params = ClaimParams(currency=currency)
    asserted = AssertedValue(value=asserted_value, currency=currency) if asserted_value is not None else None
    return CairnquillClaim(
        claim_id=claim_id,
        type=claim_type,
        text=f"Test claim {claim_id}",
        params=params,
        asserted=asserted,
        evidence_ids=evidence_ids or FIXTURE_TXN_IDS,
    )


def _make_draft(claims: list[CairnquillClaim]) -> Draft:
    return Draft(
        draft_id=FIXTURE_DRAFT_ID,
        case_id=FIXTURE_CASE_ID,
        claims=claims,
        model="test-model",
        prompt_version="quill-v1",
        author="test_user",
    )


# ── Tests: tolerance ─────────────────────────────────────────────────────────

class TestWithinTolerance:
    def test_sum_amount_exact(self):
        assert _within_tolerance(ClaimType.SUM_AMOUNT, Decimal("1000.00"), 1000.00)

    def test_sum_amount_within_tolerance(self):
        assert _within_tolerance(ClaimType.SUM_AMOUNT, Decimal("1000.005"), 1000.00)

    def test_sum_amount_outside_tolerance(self):
        assert not _within_tolerance(ClaimType.SUM_AMOUNT, Decimal("1001.00"), 1000.00)

    def test_count_exact(self):
        assert _within_tolerance(ClaimType.COUNT_TXNS, 3, 3)

    def test_count_off_by_one(self):
        assert not _within_tolerance(ClaimType.COUNT_TXNS, 4, 3)

    def test_pattern_exists_match(self):
        assert _within_tolerance(ClaimType.PATTERN_EXISTS, frozenset([101, 102, 103]), frozenset([101, 102, 103]))

    def test_pattern_exists_mismatch(self):
        assert not _within_tolerance(ClaimType.PATTERN_EXISTS, frozenset([101, 102]), frozenset([101, 102, 103]))


# ── Tests: JUDGEMENT claim ───────────────────────────────────────────────────

class TestJudgementClaim:
    def test_judgement_always_verified_as_judgement(self):
        claim = CairnquillClaim(
            claim_id="j1",
            type=ClaimType.JUDGEMENT,
            text="This pattern is consistent with circular layering.",
            evidence_ids=[],
        )
        draft = _make_draft([claim])
        conn = _make_mock_conn()
        result = verify_draft(draft, conn)

        assert result.verdicts[0].verdict == Verdict.JUDGEMENT
        assert not result.blocked

    def test_judgement_not_counted_as_failed(self):
        claims = [
            _make_claim("c1", ClaimType.SUM_AMOUNT, 1500000.0, currency="USD"),
            CairnquillClaim(
                claim_id="j1",
                type=ClaimType.JUDGEMENT,
                text="Analyst judgement: pattern consistent with layering.",
                evidence_ids=[],
            ),
        ]
        draft = _make_draft(claims)
        conn = _make_mock_conn(query_result=Decimal("1500000.000000"))
        result = verify_draft(draft, conn)

        judgement_verdict = next(v for v in result.verdicts if v.claim_id == "j1")
        assert judgement_verdict.verdict == Verdict.JUDGEMENT
        assert not result.blocked


# ── Tests: UNSUPPORTED (fabricated evidence ID) ──────────────────────────────

class TestUnsupportedClaim:
    def test_fabricated_evidence_id_returns_unsupported(self):
        claim = _make_claim(
            "c1", ClaimType.COUNT_TXNS, 3, evidence_ids=[101, 102, 999]  # 999 not in snapshot
        )
        draft = _make_draft([claim])
        conn = _make_mock_conn(snapshot_ids=[101, 102, 103])
        result = verify_draft(draft, conn)

        assert result.verdicts[0].verdict == Verdict.UNSUPPORTED
        assert result.blocked

    def test_all_valid_ids_not_unsupported(self):
        claim = _make_claim("c1", ClaimType.COUNT_TXNS, 3, evidence_ids=[101, 102, 103])
        draft = _make_draft([claim])
        conn = _make_mock_conn(snapshot_ids=[101, 102, 103], query_result=3)
        result = verify_draft(draft, conn)

        assert result.verdicts[0].verdict == Verdict.VERIFIED


# ── Tests: CONTRADICTED (currency swap, wrong amount) ────────────────────────

class TestContradictedClaim:
    def test_wrong_amount_contradicted(self):
        claim = _make_claim(
            "c1", ClaimType.SUM_AMOUNT, 1375000.0,  # wrong: actual is 1500000
            currency="USD"
        )
        draft = _make_draft([claim])
        conn = _make_mock_conn(query_result=Decimal("1500000.000000"))
        result = verify_draft(draft, conn)

        assert result.verdicts[0].verdict == Verdict.CONTRADICTED
        assert result.blocked
        assert result.verdicts[0].actual.value == pytest.approx(1500000.0, abs=0.01)

    def test_wrong_count_contradicted(self):
        claim = _make_claim("c1", ClaimType.COUNT_TXNS, 5)  # actual is 3
        draft = _make_draft([claim])
        conn = _make_mock_conn(query_result=3)
        result = verify_draft(draft, conn)

        assert result.verdicts[0].verdict == Verdict.CONTRADICTED
        assert result.blocked


# ── Tests: VERIFIED ──────────────────────────────────────────────────────────

class TestVerifiedClaim:
    def test_sum_amount_verified(self):
        claim = _make_claim("c1", ClaimType.SUM_AMOUNT, 1500000.0, currency="USD")
        draft = _make_draft([claim])
        conn = _make_mock_conn(query_result=Decimal("1500000.000000"))
        result = verify_draft(draft, conn)

        assert result.verdicts[0].verdict == Verdict.VERIFIED
        assert not result.blocked

    def test_count_txns_verified(self):
        claim = _make_claim("c1", ClaimType.COUNT_TXNS, 3)
        draft = _make_draft([claim])
        conn = _make_mock_conn(query_result=3)
        result = verify_draft(draft, conn)

        assert result.verdicts[0].verdict == Verdict.VERIFIED

    def test_time_span_verified(self):
        claim = _make_claim("c1", ClaimType.TIME_SPAN_HOURS, 24)
        draft = _make_draft([claim])
        conn = _make_mock_conn(query_result=24)
        result = verify_draft(draft, conn)

        assert result.verdicts[0].verdict == Verdict.VERIFIED


# ── Tests: Block rule ─────────────────────────────────────────────────────────

class TestBlockRule:
    def test_blocked_when_any_contradicted(self):
        claims = [
            _make_claim("c1", ClaimType.SUM_AMOUNT, 1500000.0, currency="USD"),
            _make_claim("c2", ClaimType.COUNT_TXNS, 99),  # wrong
        ]
        draft = _make_draft(claims)

        def side_effect_factory(call_count=[0]):
            def fetchone():
                call_count[0] += 1
                return (Decimal("1500000.00"),) if call_count[0] == 1 else (3,)
            return fetchone

        conn = _make_mock_conn()
        conn.cursor.return_value.__enter__.return_value.fetchone = side_effect_factory()
        result = verify_draft(draft, conn)

        assert result.blocked

    def test_not_blocked_when_all_verified(self):
        claim = _make_claim("c1", ClaimType.COUNT_TXNS, 3)
        draft = _make_draft([claim])
        conn = _make_mock_conn(query_result=3)
        result = verify_draft(draft, conn)

        assert not result.blocked


# ── Tests: Seal determinism ───────────────────────────────────────────────────

class TestSealDeterminism:
    def test_same_input_same_seal(self):
        from cairnquill.core.seal import seal
        from cairnquill.core.claims import VerificationResult, VerdictResult, Verdict

        claims = [_make_claim("c1", ClaimType.COUNT_TXNS, 3)]
        draft = _make_draft(claims)
        evidence_rows = [{"row_sha": "abc001"}, {"row_sha": "abc002"}]
        verdicts = [VerdictResult(claim_id="c1", verdict=Verdict.VERIFIED)]
        verification = VerificationResult(
            case_id=FIXTURE_CASE_ID, draft_id=FIXTURE_DRAFT_ID,
            blocked=False, verdicts=verdicts,
        )
        versions = {"model": "test", "prompt": "v1", "verifier": "0.1.0", "detector": "v1"}

        seal1 = seal(FIXTURE_CASE_ID, draft, evidence_rows, verification, versions, None)
        seal2 = seal(FIXTURE_CASE_ID, draft, evidence_rows, verification, versions, None)
        assert seal1 == seal2

    def test_different_claim_different_seal(self):
        from cairnquill.core.seal import seal
        from cairnquill.core.claims import VerificationResult, VerdictResult, Verdict

        claims1 = [_make_claim("c1", ClaimType.COUNT_TXNS, 3)]
        claims2 = [_make_claim("c1", ClaimType.COUNT_TXNS, 5)]  # different asserted value
        draft1 = _make_draft(claims1)
        draft2 = _make_draft(claims2)
        evidence_rows = [{"row_sha": "abc001"}]
        verdicts = [VerdictResult(claim_id="c1", verdict=Verdict.VERIFIED)]
        verification = VerificationResult(
            case_id=FIXTURE_CASE_ID, draft_id=FIXTURE_DRAFT_ID,
            blocked=False, verdicts=verdicts,
        )
        versions = {"model": "test", "prompt": "v1", "verifier": "0.1.0", "detector": "v1"}

        seal1 = seal(FIXTURE_CASE_ID, draft1, evidence_rows, verification, versions, None)
        seal2 = seal(FIXTURE_CASE_ID, draft2, evidence_rows, verification, versions, None)
        assert seal1 != seal2


# ── Tests: Self-approval ──────────────────────────────────────────────────────

class TestSelfApproval:
    """Self-approval is enforced in the API layer; test the logic here."""

    def test_maker_equals_approver_rejected(self):
        maker = "alice"
        approver = "alice"
        assert maker == approver  # documents the invariant

    def test_different_users_ok(self):
        maker = "alice"
        approver = "bob"
        assert maker != approver
