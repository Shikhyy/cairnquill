"""
Cairnquill core claim schema.

Defines Pydantic v2 models for all claim types, verdicts and the claim contract.
These models are the single source of truth – all other layers adapt to them.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field, model_validator


# ── Claim type enum ──────────────────────────────────────────────────────────


class ClaimType(StrEnum):
    """All supported claim types. JUDGEMENT is never verified numerically."""

    SUM_AMOUNT = "SUM_AMOUNT"
    COUNT_TXNS = "COUNT_TXNS"
    DISTINCT_COUNTERPARTIES = "DISTINCT_COUNTERPARTIES"
    TIME_SPAN_HOURS = "TIME_SPAN_HOURS"
    PATTERN_EXISTS = "PATTERN_EXISTS"
    KYC_MISMATCH = "KYC_MISMATCH"
    JUDGEMENT = "JUDGEMENT"


# ── Verdict enum ─────────────────────────────────────────────────────────────


class Verdict(StrEnum):
    """Surveyor verdict for one claim."""

    VERIFIED = "VERIFIED"
    CONTRADICTED = "CONTRADICTED"
    UNSUPPORTED = "UNSUPPORTED"
    JUDGEMENT = "JUDGEMENT"


# ── Asserted value model ──────────────────────────────────────────────────────


class AssertedValue(BaseModel):
    """Value asserted by the LLM in a claim."""

    value: float | str | None = None
    currency: str | None = None  # required for SUM_AMOUNT


# ── Claim params ──────────────────────────────────────────────────────────────


class ClaimParams(BaseModel):
    """Optional parameters passed to the SQL template."""

    currency: str | None = None
    account_key: str | None = None
    window_hours: int | None = None

    model_config = {"extra": "allow"}  # allow claim-type specific params


# ── Core claim model ──────────────────────────────────────────────────────────


class CairnquillClaim(BaseModel):
    """
    A single verifiable claim produced by Quill.

    Rules enforced here:
    - SUM_AMOUNT must include params.currency.
    - JUDGEMENT may omit asserted (it is never verified numerically).
    - Unknown types fail validation at the StrEnum level.
    - evidence_ids must reference txn_ids present in the case snapshot
      (that check is done in the verifier, not here).
    """

    claim_id: str = Field(..., min_length=1, max_length=64)
    type: ClaimType
    text: str = Field(..., min_length=1, max_length=2048)
    params: ClaimParams = Field(default_factory=ClaimParams)
    asserted: AssertedValue | None = None
    evidence_ids: list[int] = Field(default_factory=list)

    @model_validator(mode="after")
    def _validate_sum_amount_currency(self) -> "CairnquillClaim":
        if self.type == ClaimType.SUM_AMOUNT:
            if not (self.params.currency or (self.asserted and self.asserted.currency)):
                raise ValueError(
                    "SUM_AMOUNT claims must specify params.currency or asserted.currency"
                )
        return self

    @model_validator(mode="after")
    def _validate_judgement_no_asserted(self) -> "CairnquillClaim":
        # JUDGEMENT can have asserted=None; it is shown as analyst judgement
        return self

    @property
    def is_verifiable(self) -> bool:
        """True if this claim type can be checked by deterministic SQL."""
        return self.type != ClaimType.JUDGEMENT

    @property
    def currency(self) -> str | None:
        """Convenience accessor for currency from params or asserted."""
        return self.params.currency or (self.asserted.currency if self.asserted else None)


# ── Verdict result model ──────────────────────────────────────────────────────


class VerdictResult(BaseModel):
    """Result of verifying one claim."""

    claim_id: str
    verdict: Verdict
    asserted: AssertedValue | None = None
    actual: AssertedValue | None = None
    tolerance_used: float | None = None
    error: str | None = None


# ── Draft model ───────────────────────────────────────────────────────────────


class Draft(BaseModel):
    """A complete draft: the list of claims produced by Quill."""

    draft_id: str
    case_id: str
    version: int = 1
    claims: list[CairnquillClaim]
    model: str
    prompt_version: str
    author: str

    @property
    def checkable_claims(self) -> list[CairnquillClaim]:
        return [c for c in self.claims if c.is_verifiable]

    @property
    def judgement_claims(self) -> list[CairnquillClaim]:
        return [c for c in self.claims if not c.is_verifiable]


# ── Verification result model ─────────────────────────────────────────────────


class VerificationResult(BaseModel):
    """Result of verifying all claims in a draft."""

    case_id: str
    draft_id: str
    blocked: bool
    verdicts: list[VerdictResult]
    omissions: list[str] = Field(default_factory=list)

    @property
    def verified_count(self) -> int:
        return sum(1 for v in self.verdicts if v.verdict == Verdict.VERIFIED)

    @property
    def failed_verdicts(self) -> list[VerdictResult]:
        return [
            v for v in self.verdicts
            if v.verdict in (Verdict.CONTRADICTED, Verdict.UNSUPPORTED)
        ]

    def to_api_dict(self) -> dict[str, Any]:
        return {
            "case_id": self.case_id,
            "draft_id": self.draft_id,
            "blocked": self.blocked,
            "verdicts": [v.model_dump() for v in self.verdicts],
            "omissions": self.omissions,
        }
