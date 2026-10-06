"""Versioned prompt loader for Quill."""

from __future__ import annotations

from pathlib import Path

_PROMPTS_DIR = Path(__file__).parent


def load_prompt(version: str = "quill-v1") -> str:
    """Load a versioned prompt template from disk."""
    filename = f"{version}.txt" if not version.endswith(".txt") else version
    path = _PROMPTS_DIR / filename
    if not path.exists():
        path = _PROMPTS_DIR / "quill-v1.txt"
    return path.read_text(encoding="utf-8")
