"""
FastAPI dependencies – Snowflake connection and settings.
"""

from __future__ import annotations

import os
from typing import Annotated, Generator

from fastapi import Depends, Header, HTTPException, status
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    snowflake_account: str = ""
    snowflake_user: str = ""
    snowflake_role: str = "CQ_APP"
    snowflake_warehouse: str = "CQ_WH"
    snowflake_database: str = "CAIRNQUILL_DB"
    cortex_model: str = "llama3.1-70b"
    prompt_version: str = "quill-v1"
    verifier_version: str = "0.1.0"
    demo_mode: bool = True

    model_config = {"env_file": "../.env", "extra": "ignore"}


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


# ── Snowflake connection dependency ───────────────────────────────────────────

def get_db() -> Generator:
    """Yield a Snowflake connection; close after request."""
    from cairnquill.adapters.snowflake import get_connection
    conn = get_connection()
    try:
        yield conn
    finally:
        try:
            conn.close()
        except Exception:
            pass


SnowflakeConn = Annotated[object, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]


# ── Role resolution ───────────────────────────────────────────────────────────

_VALID_ROLES = {"investigator", "approver", "auditor", "dev"}


def get_current_role(
    x_role: Annotated[str | None, Header(alias="X-Role")] = None,
) -> str:
    """
    Resolve the current user role from the X-Role header.

    In production this would come from JWT/OAuth. For the demo, a header suffices.
    Falls back to 'investigator' if not set.
    """
    role = (x_role or "investigator").lower()
    if role not in _VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_ROLE", "message": f"Unknown role: {role}"}},
        )
    return role


def get_current_user(
    x_user: Annotated[str | None, Header(alias="X-User")] = None,
) -> str:
    """Resolve the current username from the X-User header. Demo only."""
    return x_user or "demo_user"


CurrentRole = Annotated[str, Depends(get_current_role)]
CurrentUser = Annotated[str, Depends(get_current_user)]
