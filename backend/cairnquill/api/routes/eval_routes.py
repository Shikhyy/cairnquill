"""Eval router – planted-error suite and scoreboard."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException

from cairnquill.api.deps import CurrentRole, SnowflakeConn, AppSettings
from cairnquill.adapters.snowflake import execute_query

logger = logging.getLogger(__name__)
router = APIRouter(tags=["eval"])


@router.get("/eval/scoreboard")
async def get_scoreboard(conn: SnowflakeConn, role: CurrentRole) -> dict:
    """Return the latest eval run metrics."""
    runs = execute_query(
        conn,
        "SELECT * FROM EVAL.RUNS ORDER BY ts DESC LIMIT 5",
        (),
    )
    return {"runs": runs, "synthetic_data": True, "note": "Results on synthetic data only. Do not generalise."}


@router.post("/eval/plant-errors")
async def run_planted_errors(
    conn: SnowflakeConn,
    role: CurrentRole,
    settings: AppSettings,
) -> dict:
    """
    Run the planted-error harness on verified claims from AUDIT.FILINGS.
    Only available in demo mode or for dev/auditor roles.
    """
    if role not in ("dev", "auditor") and not settings.demo_mode:
        raise HTTPException(403, detail={"error": {"code": "FORBIDDEN", "message": "Eval only for dev/auditor"}})

    # Import eval script
    try:
        try:
            from eval.planted_errors import run_planted_error_suite
        except ModuleNotFoundError:
            import sys
            from pathlib import Path
            repo_root = Path(__file__).resolve().parent.parent.parent.parent.parent
            if str(repo_root) not in sys.path:
                sys.path.insert(0, str(repo_root))
            from eval.planted_errors import run_planted_error_suite

        metrics = run_planted_error_suite(conn)
    except Exception as exc:
        logger.exception("Planted error suite failed")
        return {"error": str(exc), "note": "Run eval/planted_errors.py directly for details"}

    run_id = f"run_{uuid.uuid4().hex[:8]}"
    execute_query(
        conn,
        "INSERT INTO EVAL.RUNS (run_id, kind, metrics) VALUES (%s, 'PLANTED_ERROR', PARSE_JSON(%s))",
        (run_id, json.dumps(metrics, default=str)),
    )
    return {"run_id": run_id, "metrics": metrics, "synthetic_data": True}
