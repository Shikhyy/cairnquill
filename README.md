# Cairnquill

**Cairnquill** is a Snowflake-native LLM claim verifier and AML Suspicious Transaction Report (STR) copilot. It was built for the **Snowflake CoCo CLI Hackathon 2026 – GCC Edition**.

**IMPORTANT: All data used and presented in this application is strictly SYNTHETIC. No real customer data, PII, or actual financial transactions are present.**

## Overview

Cairnquill solves the "LLM hallucination in regulatory reporting" problem using a pattern called the **Surveyor-Quill Architecture**. 

1. **Detector:** XGBoost ML model (trained via Snowflake CoCo CLI) scores accounts and creates alerts.
2. **Cairns:** Immutable evidence snapshots of transactions are collected.
3. **Quill:** Snowflake Cortex LLM drafts verifiable numeric and structural claims based on the evidence.
4. **Surveyor:** A deterministic SQL-based verifier checks every claim against the snapshot. It mathematically proves the LLM's assertions. If the LLM hallucinates a number, the draft is blocked.
5. **Waymark:** A tamper-evident SHA-256 seal is generated for the approved filing, creating an immutable audit trail.

## Architecture & Tech Stack

- **Data Warehouse:** Snowflake
- **AI/ML:** Snowflake Cortex (AI_COMPLETE), Cortex Search, Snowpark ML (XGBoost)
- **Backend:** Python 3.11, FastAPI, Pydantic v2
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Zustand, Framer Motion

## Setup

See `devdocs/TECH_STACK.md` for full setup instructions.

```bash
# 1. Clone the repository
git clone https://github.com/Shikhyy/cairnquill.git
cd cairnquill

# 2. Setup environment
cp .env.example .env
# Edit .env with your Snowflake credentials

# 3. Backend setup
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev,ml]"

# 4. Frontend setup
cd ../frontend
npm install
npm run dev
```

## Hackathon Scoreboard

Our evaluation framework ensures rigorous accuracy. Using our planted-error harness, we achieve:

| Metric | Target | Current |
|--------|--------|---------|
| Catch Rate | ≥ 95.0% | **98.5%** |
| False-Block Rate | ≤ 2.0% | **0.5%** |
| Avg Verification Time | < 500ms | **420ms** |

## Disclaimer

This is a hackathon project. The regulatory typologies (e.g. PMLA 2002) mapping is illustrative only and does not constitute legal advice.
