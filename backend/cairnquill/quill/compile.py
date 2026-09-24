"""
Quill – claim compiler using Snowflake Cortex AI_COMPLETE.

Builds evidence-facts JSON from the case snapshot, sends it to the LLM,
validates the response against the claim schema, and retries once on failure.
"""

from __future__ import annotations

import json
import logging
import re
import uuid
from typing import TYPE_CHECKING, Any

from pydantic import ValidationError

from cairnquill.core.claims import CairnquillClaim, ClaimParams, AssertedValue

if TYPE_CHECKING:
    import snowflake.connector

logger = logging.getLogger(__name__)

_MAX_RETRIES = 1  # retry once on invalid JSON, then raise LLM_INVALID_JSON


class QuillCompiler:
    """Builds and repairs claim drafts via Snowflake Cortex."""

    def __init__(
        self,
        conn: "snowflake.connector.SnowflakeConnection",
        model: str,
        prompt_version: str = "quill-v1",
    ) -> None:
        self.conn = conn
        self.model = model
        self.prompt_version = prompt_version

    # ── Public API ────────────────────────────────────────────────────────────

    def compile(
        self,
        case_id: str,
        cairns: list[dict[str, Any]],
        case_rows: list[dict[str, Any]],
        kyc: dict[str, Any] | None = None,
    ) -> list[CairnquillClaim]:
        """
        Compile claims from evidence for a case.

        Args:
            case_id: The case identifier.
            cairns: List of cairn summary dicts from EVIDENCE.CAIRNS.
            case_rows: Snapshot rows from EVIDENCE.CASE_ROWS.
            kyc: Optional KYC dict for the primary account.

        Returns:
            List of validated CairnquillClaim objects.
        """
        evidence_facts = self._build_evidence_facts(case_id, cairns, case_rows, kyc)
        prompt = self._build_prompt(evidence_facts, repair_hints=None)
        return self._call_cortex_with_retry(prompt)

    def repair(
        self,
        case_id: str,
        original_claims: list[CairnquillClaim],
        repair_hints: list[dict[str, Any]],
    ) -> list[CairnquillClaim]:
        """
        Regenerate only the failed claims, given actual values.

        Args:
            case_id: The case identifier.
            original_claims: All current claims in the draft.
            repair_hints: List of {claim_id, type, text, asserted, actual, verdict}.

        Returns:
            List of corrected claims (only the failed ones).
        """
        prompt = self._build_repair_prompt(original_claims, repair_hints)
        return self._call_cortex_with_retry(prompt)

    # ── Internal ──────────────────────────────────────────────────────────────

    def _build_evidence_facts(
        self,
        case_id: str,
        cairns: list[dict],
        case_rows: list[dict],
        kyc: dict | None,
    ) -> dict[str, Any]:
        """Build the compact evidence-facts JSON for the prompt."""
        # Summarise by currency
        amounts_by_ccy: dict[str, float] = {}
        txn_ids: list[int] = []
        accounts: set[str] = set()
        ts_list: list[str] = []

        for row in case_rows:
            ccy = row.get("paid_ccy") or "USD"
            amt = float(row.get("amt_paid") or 0)
            amounts_by_ccy[ccy] = amounts_by_ccy.get(ccy, 0.0) + amt
            txn_ids.append(int(row["txn_id"]))
            accounts.add(row.get("src", ""))
            accounts.add(row.get("dst", ""))
            if row.get("ts"):
                ts_list.append(str(row["ts"]))

        patterns = [c.get("pattern_type") for c in cairns]

        facts: dict[str, Any] = {
            "case_id": case_id,
            "patterns": patterns,
            "txn_ids": sorted(set(txn_ids)),
            "amounts_by_currency": amounts_by_ccy,
            "n_txns": len(txn_ids),
            "n_accounts": len(accounts),
            "ts_min": min(ts_list) if ts_list else None,
            "ts_max": max(ts_list) if ts_list else None,
            "kyc": {
                "declared_monthly_income": kyc.get("declared_monthly_income") if kyc else None,
                "income_ccy": kyc.get("income_ccy") if kyc else None,
            } if kyc else None,
        }

        return facts

    def _build_prompt(
        self,
        evidence_facts: dict[str, Any],
        repair_hints: list[dict] | None,
    ) -> str:
        """Load the versioned prompt template and fill in evidence facts."""
        from cairnquill.quill.prompts import load_prompt
        template = load_prompt(self.prompt_version)
        return template.format(
            evidence_facts=json.dumps(evidence_facts, indent=2, default=str),
            repair_section="",
        )

    def _build_repair_prompt(
        self,
        original_claims: list[CairnquillClaim],
        repair_hints: list[dict],
    ) -> str:
        """Build a repair prompt with failed claims and actual values."""
        from cairnquill.quill.prompts import load_prompt
        template = load_prompt(self.prompt_version)
        repair_section = json.dumps(repair_hints, indent=2, default=str)
        return template.format(
            evidence_facts=json.dumps(
                [c.model_dump(exclude_none=True) for c in original_claims],
                indent=2,
                default=str,
            ),
            repair_section=repair_section,
        )

    def _call_cortex(self, prompt: str) -> str:
        """Call Snowflake Cortex AI_COMPLETE and return the raw text response."""
        sql = """
            SELECT SNOWFLAKE.CORTEX.COMPLETE(
                %s,
                %s
            )::STRING AS response
        """
        with self.conn.cursor() as cur:
            cur.execute(sql, (self.model, prompt))
            row = cur.fetchone()
            if not row:
                raise ValueError("Cortex returned no response")
            return str(row[0])

    def _parse_claims(self, raw_response: str) -> list[CairnquillClaim]:
        """Parse and validate the LLM response into claim objects."""
        # Extract JSON array from the response (LLM may wrap in markdown)
        text = raw_response.strip()
        json_match = re.search(r"\[.*\]", text, re.DOTALL)
        if not json_match:
            raise ValueError(f"No JSON array found in response: {text[:200]}")

        try:
            raw_claims = json.loads(json_match.group())
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON: {exc}") from exc

        if not isinstance(raw_claims, list):
            raise ValueError("Expected a JSON array of claims")

        claims = []
        for raw in raw_claims:
            # Ensure claim_id is set
            if "claim_id" not in raw:
                raw["claim_id"] = f"c-{uuid.uuid4().hex[:8]}"
            try:
                claim = CairnquillClaim.model_validate(raw)
                claims.append(claim)
            except ValidationError as exc:
                logger.warning("Invalid claim skipped: %s – %s", raw, exc)

        if not claims:
            raise ValueError("No valid claims parsed from LLM response")

        return claims

    def _call_cortex_with_retry(self, prompt: str) -> list[CairnquillClaim]:
        """Call Cortex, validate JSON; retry once on failure."""
        last_error: Exception | None = None

        for attempt in range(_MAX_RETRIES + 1):
            try:
                raw = self._call_cortex(prompt)
                return self._parse_claims(raw)
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "Cortex call attempt %d failed: %s", attempt + 1, exc
                )

        raise ValueError(
            f"LLM_INVALID_JSON: Cortex failed after {_MAX_RETRIES + 1} attempts. "
            f"Last error: {last_error}"
        )
