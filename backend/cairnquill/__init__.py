"""
Cairnquill – LLM claim verifier and AML STR copilot.

Package entrypoint. Exposes the public API surface of the core library.
"""

from cairnquill.core.claims import (
    Claim,
    ClaimType,
    CairnquillClaim,
    Verdict,
    VerdictResult,
)
from cairnquill.core.verify import verify_draft
from cairnquill.core.seal import seal, replay_seal
from cairnquill.core.repair import repair_draft

__all__ = [
    "Claim",
    "ClaimType",
    "CairnquillClaim",
    "Verdict",
    "VerdictResult",
    "verify_draft",
    "seal",
    "replay_seal",
    "repair_draft",
]

__version__ = "0.1.0"
