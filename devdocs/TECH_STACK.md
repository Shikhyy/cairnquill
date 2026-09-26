# Cairnquill: Tech Stack

Every choice below says what it is, why, and what to fall back to. Pin exact versions in lockfiles when you scaffold. Check current Snowflake documentation for exact syntax, since Cortex features change quickly.

## 1. Architecture at a glance

```
┌──────────────┐   HTTPS/JSON   ┌───────────────────┐   connector    ┌──────────────────────────┐
│  Web UI      │ ─────────────► │  API (FastAPI)    │ ─────────────► │  Snowflake               │
│  React + TS  │ ◄───────────── │  core/ verifier   │ ◄───────────── │  tables · Dynamic Tables │
└──────────────┘                │  Quill · Waymark  │                │  Model Registry          │
                                └─────────┬─────────┘                │  Cortex AI_COMPLETE      │
                                          │                          │  Semantic View + Agent   │
                                  ┌───────▼────────┐                 │  Cortex Search           │
                                  │ cairnquill CLI │                 │  masking · roles         │
                                  └────────────────┘                 └──────────────────────────┘
```

**Principle:** the data, the model, the LLM and the audit trail live in Snowflake. The API is a thin, deterministic orchestrator. The verifier never calls an LLM for numeric claims.

## 2. Layer-by-layer choices

| Layer | Choice | Why | Fallback |
|---|---|---|---|
| Data platform | Snowflake | Hackathon requirement; data, ML, LLM and governance in one place | None |
| Build assistant | Snowflake CoCo CLI | Hackathon requirement; builds Snowflake objects from prompts | Hand-written SQL |
| IDE and agents | Google Antigravity (check hackathon rules) | Parallel agents for UI, verifier, docs | VS Code or Cursor |
| Backend | Python 3.11+, FastAPI, Pydantic v2, Uvicorn | Same language as Snowpark and ML; typed contracts | Flask |
| Snowflake access | `snowflake-connector-python` with key-pair auth | Simple, supports bind variables | Snowpark session |
| ML | `snowflake-ml-python`, XGBoost, Model Registry | Train and version inside Snowflake | scikit-learn locally, imported scores |
| LLM | Snowflake Cortex `AI_COMPLETE` (structured output if available) | Data never leaves Snowflake | `SNOWFLAKE.CORTEX.COMPLETE` |
| NL questions | Semantic View + Cortex Analyst + Cortex Agent | Governed metrics | Hand-written SQL endpoints |
| Regulatory text | Cortex Search service | Retrieval with source attribution | Keyword search in a table |
| Graph model (T3) | IBM Multi-GNN (open source) | Detects ring patterns | Skip; XGBoost only |
| Frontend | Vite, React 18, TypeScript | Fast iteration | Next.js |
| Styling | Tailwind CSS, shadcn/ui, CSS variables | Token-driven, accessible primitives | Plain CSS modules |
| Motion | Motion (Framer Motion) | Spring animations, reduced-motion support | CSS transitions |
| Data fetching | TanStack Query | Caching, loading and error states | SWR |
| State | Zustand | Tiny global state (role, demo mode) | React context |
| Graph view | Cytoscape.js | Handles small directed graphs well | D3 force |
| Charts | Recharts | Scoreboard bars | Chart.js |
| Icons | lucide-react | Consistent line icons | Heroicons |
| Tests | pytest, Vitest, Playwright | Unit, component, end-to-end | Manual checklist |
| Lint and format | Ruff, mypy, ESLint, Prettier | Catch agent mistakes early | None |
| Packaging | `pyproject.toml`, `uv` or pip | Installable CLI later | requirements.txt |
| Deployment | Local for T1; containers on Snowpark Container Services for T3 | Keeps everything inside Snowflake | Any container host |
| Fallback UI | Streamlit in Snowflake | Fully Snowflake-native; less design control | None |

## 3. Snowflake components, and exactly how each is used

| Component | Object | Used for | Build with |
|---|---|---|---|
| Warehouse | `CQ_WH` (X-Small, auto-suspend 60s) | All queries | CoCo |
| Resource monitor | `CQ_RM` | Credit cap | CoCo |
| Roles | `CQ_DEV`, `CQ_APP`, `CQ_AUDITOR` | Least privilege | CoCo or SQL |
| Stage | `RAW.LANDING` | CSV landing | CoCo |
| Tables | `RAW.TXNS`, `RAW.KYC`, `CASES.*`, `EVIDENCE.*`, `AUDIT.*`, `EVAL.*` | Data, snapshots, audit | CoCo |
| Dynamic Table | `FEATURES.ACCOUNT_FEATURES` | Incremental features | CoCo |
| Model Registry | `CQ_DETECTOR` | Versioned detector | CoCo ML skill |
| Cortex LLM | `AI_COMPLETE` | Quill drafting and repair | Backend SQL call |
| Semantic View | `CQ_RISK_SV` | Governed risk metrics | CoCo semantic-view skill |
| Cortex Agent | `CQ_ASSISTANT` | Natural-language helper | CoCo cortex-agent skill |
| Cortex Search | `REG.REG_SEARCH` | Regulatory passages with sources | SQL |
| Masking policy | `MASK_KYC_FIELD` | Hide KYC from auditor role | SQL |
| Streams or Tasks (optional) | `T_REFRESH_ALERTS` | Scheduled alert refresh | SQL |
| SPCS (T3) | image repo, compute pool, service | Host API and UI | CoCo or SQL |

**What CoCo CLI does in this project**

1. Creates schemas, tables, stage and the load pipeline.
2. Builds the feature Dynamic Table and trains and registers the detector.
3. Builds the Semantic View and the Cortex Agent using its semantic-view and agent skills.
4. Evaluates the agent with its evaluate command.
5. Writes the SQL for the evidence miner for you to review.

**What CoCo does not do:** it does not sit in the filing path at runtime. The verifier and seal run as plain, tested code.

## 4. Repository layout

```
cairnquill/
  AGENTS.md
  docs/                 PRD.md  APP_FLOW.md  TECH_STACK.md  FRONTEND_GUIDELINES.md
                        BACKEND_SCHEMA.md  IMPLEMENTATION_PLAN.md  COCO_LOG.md
  sql/                  00_setup.sql 01_load.sql 02_features.sql 03_alerts.sql
                        04_evidence.sql 05_audit.sql 06_governance.sql 07_reg_search.sql
  backend/
    cairnquill/
      core/             claims.py verify.py seal.py repair.py recall.py
      claims/           templates.py          # one SQL template per claim type
      quill/            compile.py prompts/   # versioned prompts
      adapters/         snowflake.py
      api/              main.py routes/ deps.py
      cli.py
    tests/              test_verify.py test_seal.py test_planted_errors.py
    pyproject.toml
  frontend/
    src/ app/ components/ features/ lib/ styles/
    package.json
  eval/                 planted_errors.py scoreboard.py gold_claims.json
  examples/aml_str/     demo data scripts and walkthrough
  scripts/              generate_kyc.py parse_patterns.py
  .env.example
```

## 5. Environment variables

```
SNOWFLAKE_ACCOUNT=
SNOWFLAKE_USER=
SNOWFLAKE_PRIVATE_KEY_PATH=      # key-pair auth; never commit
SNOWFLAKE_ROLE=CQ_APP
SNOWFLAKE_WAREHOUSE=CQ_WH
SNOWFLAKE_DATABASE=CAIRNQUILL_DB
CORTEX_MODEL=                    # a model available in your region
PROMPT_VERSION=quill-v1
VERIFIER_VERSION=0.1.0
DEMO_MODE=true
```

## 6. Setup commands (generic)

```bash
# backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install fastapi uvicorn pydantic snowflake-connector-python \
            snowflake-snowpark-python snowflake-ml-python xgboost pandas \
            pytest ruff mypy cryptography
uvicorn cairnquill.api.main:app --reload

# frontend
cd frontend && npm install && npm run dev
```

## 7. Quality gates

- `ruff` and `mypy` clean on `backend/`.
- `pytest` must include planted-error tests for every claim type.
- `vitest` for components; one Playwright test for the happy path and one for the inject-error path.
- No merge if any verifier test fails.

## 8. Security

- Key-pair authentication or a programmatic access token; secrets only in environment variables.
- `CQ_APP` has `INSERT` only on `AUDIT.FILINGS`; no `UPDATE` or `DELETE`.
- The auditor role sees KYC fields through a masking policy.
- Run CoCo and Antigravity with a least-privilege dev role, never `ACCOUNTADMIN`, and keep terminal commands on approval. CoCo CLI had a prompt-injection vulnerability disclosed in March 2026, so treat any untrusted README or file content as hostile.
- Bind variables for all values in SQL. Never string-format user or LLM text into SQL.
- All data is synthetic. Do not load anything real.

## 9. Known unknowns to check in current docs

- Exact `AI_COMPLETE` signature and structured-output option in your region.
- Models available to your account.
- Current CoCo CLI install steps and skill names.
- Cortex Agent custom-tool support.
- Snowpark Container Services availability on your account tier.
