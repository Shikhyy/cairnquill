"""
Cairnquill seal and replay (Waymark).

Produces a deterministic SHA-256 seal over the canonical filing content.
No timestamps in the payload – replay must reproduce the same hash.
"""

from __future__ import annotations

import hashlib
import json
from typing import TYPE_CHECKING, Any

from cairnquill.core.claims import VerdictResult

if TYPE_CHECKING:
    from cairnquill.core.claims import Draft, VerificationResult


def _row_sha(row: dict[str, Any]) -> str:
    """Canonical hash of one snapshot row (case_id+cairn_id+txn_id+amt+ccy)."""
    key = "|".join(
        str(row.get(k, "")) for k in ["case_id", "cairn_id", "txn_id", "amt_paid", "paid_ccy"]
    )
    return hashlib.sha256(key.encode()).hexdigest()


def _evidence_sha(row_shas: list[str]) -> str:
    """Hash of sorted row SHAs – order-independent."""
    canonical = json.dumps(sorted(row_shas), separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


def seal(
    case_id: str,
    draft: "Draft",
    evidence_rows: list[dict[str, Any]],
    verification: "VerificationResult",
    versions: dict[str, str],
    prev_seal: str | None,
) -> str:
    """
    Compute the tamper-evident seal SHA-256.

    Payload (deterministic, no timestamps):
    - case_id
    - evidence_sha: hash of all snapshot row hashes
    - claims: canonical JSON of claim list
    - verdicts: list of (claim_id, verdict) tuples
    - versions: {model, prompt, verifier, detector}
    - prev: previous seal SHA (hash chain)

    Returns hex digest.
    """
    row_shas = [row.get("row_sha", _row_sha(row)) for row in evidence_rows]

    # Canonical claims: sort by claim_id for determinism
    claims_payload = sorted(
        [c.model_dump(exclude_none=True) for c in draft.claims],
        key=lambda c: c["claim_id"],
    )

    # Canonical verdicts
    verdicts_payload = sorted(
        [(v.claim_id, v.verdict.value) for v in verification.verdicts],
        key=lambda t: t[0],
    )

    payload: dict[str, Any] = {
        "case": case_id,
        "evidence": _evidence_sha(row_shas),
        "claims": claims_payload,
        "verdicts": verdicts_payload,
        "versions": versions,
        "prev": prev_seal,
    }

    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


def replay_seal(
    case_id: str,
    draft: "Draft",
    evidence_rows: list[dict[str, Any]],
    verification: "VerificationResult",
    versions: dict[str, str],
    prev_seal: str | None,
    expected_seal: str,
) -> tuple[bool, str]:
    """
    Replay verification: recompute the seal and compare to the stored one.

    Returns (match: bool, computed_seal: str).
    A mismatch means the filing was tampered with.
    """
    computed = seal(case_id, draft, evidence_rows, verification, versions, prev_seal)
    return computed == expected_seal, computed


def verify_chain(
    filings: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Verify the hash chain across all filings ordered by approved_ts.

    Returns a list of {filing_id, valid, reason} dicts.
    A broken prev_seal_sha link means something was inserted or edited.
    """
    results = []
    prev = None
    for filing in sorted(filings, key=lambda f: f.get("approved_ts", "")):
        stored_prev = filing.get("prev_seal_sha")
        if prev is None:
            # First filing – prev should be None
            valid = stored_prev is None
            reason = "OK" if valid else f"Expected no previous seal; got {stored_prev}"
        else:
            valid = stored_prev == prev
            reason = "OK" if valid else f"Chain broken: expected {prev[:12]}…, got {stored_prev!r}"

        results.append({
            "filing_id": filing["filing_id"],
            "valid": valid,
            "reason": reason,
        })
        prev = filing["seal_sha"]

    return results
