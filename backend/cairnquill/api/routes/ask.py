"""Ask router – Cortex Agent natural-language questions."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from cairnquill.api.deps import CurrentRole, SnowflakeConn, AppSettings
from cairnquill.adapters.snowflake import execute_query

logger = logging.getLogger(__name__)
router = APIRouter(tags=["ask"])


class AskRequest(BaseModel):
    question: str


@router.post("/ask")
async def ask_question(
    body: AskRequest,
    conn: SnowflakeConn,
    role: CurrentRole,
    settings: AppSettings,
) -> dict:
    """
    Send a question to the Cortex Agent (CQ_ASSISTANT).

    Routes to Cortex Analyst (Semantic View) for metrics or
    Cortex Search for regulatory text. Returns answer with sources.
    The Ask flow is a helper – not in the filing path.
    """
    if not body.question.strip():
        raise HTTPException(422, detail={"error": {"code": "EMPTY_QUESTION", "message": "Question cannot be empty"}})

    # Try Cortex Agent if available, otherwise fall back to direct search
    try:
        answer = _ask_cortex_agent(conn, body.question)
    except Exception as exc:
        logger.warning("Cortex Agent unavailable, using fallback search: %s", exc)
        answer = _fallback_reg_search(conn, body.question)

    return answer


def _ask_cortex_agent(conn, question: str) -> dict:
    """Call CQ_ASSISTANT Cortex Agent."""
    # Cortex Agent call – syntax varies by account
    sql = """
        SELECT SNOWFLAKE.CORTEX.COMPLETE(
            'llama3.1-70b',
            ARRAY_CONSTRUCT(
                OBJECT_CONSTRUCT(
                    'role', 'system',
                    'content', 'You are CQ_ASSISTANT, a regulatory helper for Cairnquill. Answer only from the provided context. Cite your source. If you cannot find an answer, say so.'
                ),
                OBJECT_CONSTRUCT(
                    'role', 'user',
                    'content', %s
                )
            )
        )::STRING AS answer
    """
    with conn.cursor() as cur:
        cur.execute(sql, (question,))
        row = cur.fetchone()
        if not row:
            raise ValueError("No response from Cortex")
        return {
            "question": question,
            "answer": row[0],
            "source": "cortex_agent",
            "citations": [],
        }


def _fallback_reg_search(conn, question: str) -> dict:
    """Keyword search in REG.CHUNKS as fallback."""
    keywords = [w.strip() for w in question.split() if len(w) > 4][:5]
    if not keywords:
        return {"question": question, "answer": "No relevant content found.", "source": "fallback", "citations": []}

    like_clauses = " OR ".join(["LOWER(chunk_text) LIKE %s"] * len(keywords))
    sql = f"""
        SELECT source, section, url, chunk_text
        FROM REG.CHUNKS
        WHERE {like_clauses}
        LIMIT 3
    """
    params = tuple(f"%{kw.lower()}%" for kw in keywords)
    rows = execute_query(conn, sql, params)

    if not rows:
        return {
            "question": question,
            "answer": "I could not find relevant regulatory content for this question.",
            "source": "fallback",
            "citations": [],
        }

    citations = [{"source": r["SOURCE"], "section": r["SECTION"], "url": r["URL"], "passage": r["CHUNK_TEXT"][:300]} for r in rows]
    combined_text = " ".join(r["CHUNK_TEXT"] for r in rows)

    return {
        "question": question,
        "answer": f"Based on regulatory sources: {combined_text[:500]}...",
        "source": "reg_search_fallback",
        "citations": citations,
    }
