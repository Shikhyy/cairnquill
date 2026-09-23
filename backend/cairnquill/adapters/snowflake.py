"""
Snowflake adapter – connection factory and query helpers.

Uses key-pair authentication or a connection string from environment variables.
Never logs credentials or KYC data.
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


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


def get_connection() -> "snowflake.connector.SnowflakeConnection":
    """
    Create a Snowflake connection from environment variables.

    Required env vars:
        SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, SNOWFLAKE_ROLE,
        SNOWFLAKE_WAREHOUSE, SNOWFLAKE_DATABASE

    Auth (one of):
        SNOWFLAKE_PRIVATE_KEY_PATH (key-pair, recommended)
        SNOWFLAKE_PASSWORD (password auth, dev only)
    """
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
        # Fall back to password auth (dev only)
        password = os.environ.get("SNOWFLAKE_PASSWORD", "")
        if not password:
            raise RuntimeError(
                "No Snowflake auth configured. "
                "Set SNOWFLAKE_PRIVATE_KEY_PATH or SNOWFLAKE_PASSWORD."
            )
        connect_kwargs["password"] = password
        logger.warning("Using password auth – use key-pair auth in production")

    logger.info("Connecting to Snowflake account=%s user=%s role=%s", account, user, role)
    conn = snowflake.connector.connect(**connect_kwargs)
    conn.cursor().execute(f"USE WAREHOUSE {warehouse}")
    conn.cursor().execute(f"USE DATABASE {database}")
    return conn


class SnowflakeSession:
    """Context manager for a Snowflake connection."""

    def __init__(self) -> None:
        self._conn: "snowflake.connector.SnowflakeConnection | None" = None

    def __enter__(self) -> "snowflake.connector.SnowflakeConnection":
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
    conn: "snowflake.connector.SnowflakeConnection",
    sql: str,
    params: tuple = (),
) -> list[dict[str, Any]]:
    """Execute a query and return rows as dicts. Bind variables only."""
    with conn.cursor(snowflake.connector.DictCursor) as cur:  # type: ignore[attr-defined]
        cur.execute(sql, params)
        return cur.fetchall() or []


def execute_scalar(
    conn: "snowflake.connector.SnowflakeConnection",
    sql: str,
    params: tuple = (),
) -> Any:
    """Execute a query and return the first column of the first row."""
    with conn.cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()
        return row[0] if row else None
