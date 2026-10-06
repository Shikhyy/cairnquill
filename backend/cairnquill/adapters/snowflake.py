"""
Snowflake adapter – connection factory and query helpers.

Uses key-pair authentication or password from environment variables when configured.
Falls back automatically to the embedded SQLite synthetic emulator when Snowflake
credentials or libraries are not present, ensuring 100% offline & local dev support.
Never logs credentials or KYC data.
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


def is_snowflake_configured() -> bool:
    """Check if Snowflake credentials and connector are available."""
    if not os.environ.get("SNOWFLAKE_ACCOUNT") or not os.environ.get("SNOWFLAKE_USER"):
        return False
    try:
        import snowflake.connector  # noqa: F401
        return True
    except ImportError:
        return False


def _get_private_key() -> bytes | None:
    """Load the private key for key-pair auth if configured."""
    key_path = os.environ.get("SNOWFLAKE_PRIVATE_KEY_PATH", "")
    if not key_path:
        return None
    try:
        from cryptography.hazmat.backends import default_backend
        from cryptography.hazmat.primitives.serialization import (
            Encoding,
            NoEncryption,
            PrivateFormat,
            load_pem_private_key,
        )

        pem_data = Path(key_path).read_bytes()
        passphrase = os.environ.get("SNOWFLAKE_PRIVATE_KEY_PASSPHRASE", "").encode() or None
        private_key = load_pem_private_key(pem_data, password=passphrase, backend=default_backend())
        return private_key.private_bytes(
            encoding=Encoding.DER,
            format=PrivateFormat.PKCS8,
            encryption_algorithm=NoEncryption(),
        )
    except Exception:
        logger.exception("Failed to load Snowflake private key from %s", key_path)
        return None


def get_connection() -> Any:
    """
    Create a Snowflake connection from environment variables, or fall back
    to the embedded SQLite synthetic emulator for local development and demos.

    Required env vars (when connecting to real Snowflake):
        SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, SNOWFLAKE_ROLE,
        SNOWFLAKE_WAREHOUSE, SNOWFLAKE_DATABASE

    Auth (one of):
        SNOWFLAKE_PRIVATE_KEY_PATH (key-pair, recommended)
        SNOWFLAKE_PASSWORD (password auth, dev only)
    """
    if not is_snowflake_configured():
        from cairnquill.adapters.local_db import get_local_connection
        logger.info("Using embedded SQLite synthetic database (Snowflake not configured or offline).")
        return get_local_connection()

    import snowflake.connector  # noqa: PLC0415

    account = os.environ["SNOWFLAKE_ACCOUNT"]
    user = os.environ["SNOWFLAKE_USER"]
    role = os.environ.get("SNOWFLAKE_ROLE", "CQ_APP")
    warehouse = os.environ.get("SNOWFLAKE_WAREHOUSE", "CQ_WH")
    database = os.environ.get("SNOWFLAKE_DATABASE", "CAIRNQUILL_DB")

    connect_kwargs: dict[str, Any] = {
        "account": account,
        "user": user,
        "role": role,
        "warehouse": warehouse,
        "database": database,
        "application": "cairnquill",
    }

    private_key = _get_private_key()
    if private_key is not None:
        connect_kwargs["private_key"] = private_key
    else:
        password = os.environ.get("SNOWFLAKE_PASSWORD", "")
        if not password:
            from cairnquill.adapters.local_db import get_local_connection
            logger.warning("No Snowflake password configured. Falling back to local synthetic SQLite engine.")
            return get_local_connection()
        connect_kwargs["password"] = password
        logger.warning("Using password auth – use key-pair auth in production")

    logger.info("Connecting to Snowflake account=%s user=%s role=%s", account, user, role)
    conn = snowflake.connector.connect(**connect_kwargs)
    conn.cursor().execute(f"USE WAREHOUSE {warehouse}")
    conn.cursor().execute(f"USE DATABASE {database}")
    return conn


class SnowflakeSession:
    """Context manager for a Snowflake or local emulator connection."""

    def __init__(self) -> None:
        self._conn: Any = None

    def __enter__(self) -> Any:
        self._conn = get_connection()
        return self._conn

    def __exit__(self, *_: Any) -> None:
        if self._conn is not None:
            try:
                self._conn.close()
            except Exception:
                pass
            self._conn = None


def execute_query(
    conn: Any,
    sql: str,
    params: tuple = (),
) -> list[dict[str, Any]]:
    """Execute a query and return rows as dicts. Bind variables only."""
    try:
        import snowflake.connector  # noqa: PLC0415
        if isinstance(conn, snowflake.connector.SnowflakeConnection):
            with conn.cursor(snowflake.connector.DictCursor) as cur:  # type: ignore[attr-defined]
                cur.execute(sql, params)
                return cur.fetchall() or []
    except (ImportError, AttributeError):
        pass

    with conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall() or []
        return [dict(r) if hasattr(r, "keys") else r for r in rows]


def execute_scalar(
    conn: Any,
    sql: str,
    params: tuple = (),
) -> Any:
    """Execute a query and return the first column of the first row."""
    with conn.cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()
        return row[0] if row else None
