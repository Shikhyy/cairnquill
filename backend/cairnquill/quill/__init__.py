"""Quill prompts loader – loads versioned prompt templates from this directory."""

from __future__ import annotations

from pathlib import Path

_PROMPTS_DIR = Path(__file__).parent / "prompts"


def load_prompt(version: str) -> str:
    """Load a versioned prompt template by name (e.g. 'quill-v1')."""
    path = _PROMPTS_DIR / f"{version}.txt"
    if not path.exists():
        raise FileNotFoundError(f"Prompt template not found: {path}")
    return path.read_text(encoding="utf-8")
