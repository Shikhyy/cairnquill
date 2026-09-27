"""Alerts router – list open alerts with SLA."""

from __future__ import annotations

from fastapi import APIRouter

from cairnquill.api.deps import CurrentRole, SnowflakeConn
from cairnquill.adapters.snowflake import execute_query

router = APIRouter(tags=["alerts"])


@router.get("/alerts")
async def list_alerts(
    conn: SnowflakeConn,
    role: CurrentRole,
    limit: int = 50,
    status: str = "OPEN",
) -> dict:
    """List alerts sorted by score desc, sla_due asc."""
    rows = execute_query(
        conn,
        """
        SELECT alert_id, account_key, score, model_version,
               created_ts::STRING AS created_ts,
               sla_due::STRING AS sla_due, status,
               DATEDIFF('day', CURRENT_DATE(), sla_due) AS days_remaining
        FROM CASES.ALERTS
        WHERE status = %s
        ORDER BY score DESC, sla_due ASC
        LIMIT %s
        """,
        (status, limit),
    )
    return {"alerts": rows, "synthetic_data": True}
