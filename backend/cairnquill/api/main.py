"""
Cairnquill FastAPI application.

All routes log to AUDIT.EVENTS. State rules are enforced in the backend.
"""

from __future__ import annotations

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from cairnquill.api.routes import (
    alerts,
    cases,
    demo,
    eval_routes,
    filings,
    ask,
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Cairnquill API",
    description=(
        "LLM claim verifier and AML STR copilot – SYNTHETIC data only. "
        "Not for production filing."
    ),
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS – allow the Vite dev server in dev mode
_ALLOWED_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(alerts.router, prefix="/api")
app.include_router(cases.router, prefix="/api")
app.include_router(filings.router, prefix="/api")
app.include_router(demo.router, prefix="/api")
app.include_router(eval_routes.router, prefix="/api")
app.include_router(ask.router, prefix="/api")


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "version": "0.1.0", "synthetic_data": True}
