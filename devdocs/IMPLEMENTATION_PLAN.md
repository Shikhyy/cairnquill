# Cairnquill: Implementation Plan

How to build it, in order, with the exact split between **Snowflake CoCo CLI** (Snowflake side) and **Antigravity agents** (code side). Read `AGENTS.md` first.

> **Time reality.** The event page lists 4 Oct 2026 as the last prototype day. If you can still submit, do **Sprint A** (T1) and submit. If you are shortlisted, use **Sprint B** before the demo days. Estimates assume 3 to 4 people and are rough.

## 0. Ground rules

1. Finish T1 end to end before starting anything in T2 or T3.
2. Every phase ends with a checkpoint you can demonstrate.
3. Use a least-privilege Snowflake role. Keep terminal commands on approval.
4. Keep `docs/COCO_LOG.md`: for each CoCo prompt, paste the prompt, a one-line result and any fix. This is your evidence for judges.
5. All data is synthetic. Say so in the UI and README.
6. Check the Terms and Conditions on which AI tools are allowed.

## 1. Roles on the team

| Person | Owns |
|---|---|
| A: Data lead | Phases 1, 2, 3 (Snowflake, CoCo) |
| B: Verifier lead | Phases 4, 5, 6 (core library) |
| C: UI lead | Phase 8 (frontend) |
| D: Eval and docs | Phases 7, 9 (scoreboard, README, demo) |

With fewer people, merge A with D and B with C.

---

# Sprint A: ship T1

## Phase 1: Setup and data (about 2h) · Owner A · Tool: CoCo CLI

1. Create the role, warehouse and resource monitor (see `BACKEND_SCHEMA.md` section 3).
2. Download AMLworld HI-Small from Kaggle. Confirm the folder has the transactions file, the patterns file and the accounts file.
3. Run the load and build `RAW.TXNS` with stable `txn_id`.
4. Generate synthetic KYC with `scripts/generate_kyc.py` and load `RAW.KYC`.
5. Parse the patterns file into `GT.PATTERNS`. Open the file first to confirm its block format.

**CoCo prompts (adapt as needed)**

> P1. "Create database CAIRNQUILL_DB with schemas RAW, GT, FEATURES, CASES, EVIDENCE, AUDIT, EVAL, REG, a warehouse CQ_WH (X-Small, auto-suspend 60s) and a resource monitor with a 20-credit quota. Use my dev role, not ACCOUNTADMIN."

> P2. "Create a stage and file format, load HI-Small_Trans.csv into RAW.TXNS_STG, then build RAW.TXNS with a reproducible txn_id (order by every column), src and dst as bank:account, and NUMBER(38,6) amounts."

**Checkpoint 1:** row count matches the CSV; a laundering row joins to a typology in `GT.PATTERNS`.

## Phase 2: Detector (about 2h) · Owner A · Tool: CoCo CLI (ML skill)

> P3. "Build FEATURES.ACCOUNT_FEATURES as a Dynamic Table with out-degree, in-degree, distinct counterparties, 24-hour velocity and amount statistics per account."

> P4. "Train an XGBoost classifier on is_laundering using a time-based split with class weighting. Log it to the Model Registry as CQ_DETECTOR version v1. Report PR-AUC, minority-class F1 and recall at the top 0.5% alert budget. Write top accounts to CASES.ALERTS with sla_due set to 7 working days."

**Checkpoint 2:** `CASES.ALERTS` is populated; metrics are written to `EVAL.RUNS`.

**Cut line:** if training runs long, train on a time slice and say so.

## Phase 3: Evidence miner (about 2h) · Owner A · Tool: CoCo CLI + review by hand

> P5. "Write parameterised SQL that finds 3-hop cycles within 72 hours, fan-out and fan-in patterns anchored on one account, and a procedure that inserts matched rows into EVIDENCE.CASE_ROWS and a row into EVIDENCE.CAIRNS for a given case_id."

Review every join by hand. Add row limits.

**Checkpoint 3:** for a known ring in `GT.PATTERNS`, the miner returns a snapshot whose pattern type matches the label.

## Phase 4: Core library and claim schema (about 2h) · Owner B · Tool: Antigravity (Verifier agent)

- Implement `core/claims.py` (Pydantic models from the claim schema), `claims/templates.py` (one SQL template per type) and `core/verify.py`.
- Bind variables only.
- Unit tests with fixtures, including fabricated IDs and currency swaps.

**Checkpoint 4:** `pytest` green; every claim type verified on a fixture snapshot.

## Phase 5: Quill and repair (about 2h) · Owner B · Tool: Antigravity + Snowflake

- `quill/compile.py` builds the evidence-facts JSON and calls `AI_COMPLETE` through the connector.
- Validate JSON against the schema; retry once.
- `core/repair.py` sends failed claims with actual values back; max 2 rounds.
- Prompts live in `quill/prompts/` with a version string.

**Checkpoint 5:** for three real cases, Quill produces schema-valid claims; at least one contains a deliberate error you inject, and verify blocks it.

## Phase 6: Seal, replay, maker-checker (about 1.5h) · Owner B · Tool: Antigravity

- `core/seal.py` and `AUDIT.FILINGS` insert; hash chain with `prev_seal_sha`.
- Replay endpoint: reload, re-verify, recompute, compare.
- Reject self-approval.

**Checkpoint 6:** two sealed filings; replay matches; editing a stored claim in a test breaks the match.

## Phase 7: Planted-error scoreboard (about 1.5h) · Owner D · Tool: Antigravity (Eval agent)

- `eval/planted_errors.py` applies mutations to 100 verified claims.
- `eval/scoreboard.py` prints and stores metrics.
- Run once without the verifier gate (baseline) and once with it.

**Checkpoint 7:** one table with the metrics from `PRD.md` section 9.

## Phase 8: API and minimal UI (about 4h) · Owners B and C · Tool: Antigravity (API and UI agents)

- FastAPI routes from `BACKEND_SCHEMA.md` section 12, in the order the flow needs them.
- UI screens: Queue, Case, Draft (with claim badges and cairn stack), Review, Filing with Replay.
- Follow `FRONTEND_GUIDELINES.md`. Build the cairn stack last, after everything works.

**Checkpoint 8:** a person who didn't build it can go alert → draft → block → repair → approve → replay without help.

## Phase 9: Demo and submission (about 2h) · Owner D

- Script the 5-minute demo (below).
- Record a backup video of the full run.
- README with architecture, scoreboard, setup and the synthetic-data notice.
- Submission checklist (below).

**Sprint A total:** about 19 hours of work across the team.

---

# Sprint B: T2 and T3 (finalist polish)

## Phase 10: Governance and roles (about 2h)
- Masking policy on KYC for `CQ_AUDITOR`.
- Role switcher in the UI; enforce roles in the API.
- Tipping-off notice and SLA warning states.

## Phase 11: Semantic View and Cortex Agent (about 3h) · Tool: CoCo CLI skills

> P6. "Using the semantic-view skill, build CQ_RISK_SV over CASES.ALERTS, CASES.CASES and AUDIT.FILINGS with metrics: open alerts, overdue cases, blocked drafts, average hours to draft. Add verified queries for these questions: open alerts due this week, overdue cases by typology."

> P7. "Using the cortex-agent skill, create CQ_ASSISTANT with Cortex Analyst on CQ_RISK_SV and Cortex Search on REG.REG_SEARCH. Instruct it to answer only from tool results, cite sources and say when it cannot find an answer."

> P8. "Evaluate CQ_ASSISTANT on 15 test questions, including 5 it should refuse. Report accuracy and refusal behaviour."

## Phase 12: Regulatory search (about 2h)
- Collect public PMLA and FIU-IND text, chunk it into `REG.CHUNKS` with source and section.
- Create `REG.REG_SEARCH`.
- Fill `REG.TYPOLOGY_MAP` (illustrative, labelled not legal advice).

## Phase 13: Multi-GNN (optional, about 4h)
- Run IBM's open-source Multi-GNN code with reverse message passing, port numbering and ego IDs on HI-Small.
- Import scores to a table, compare to XGBoost, show the ring-pattern gain in the scoreboard.

## Phase 14: Packaging and deployment (about 4h)
- CLI wrapper over `core/` (`init`, `compile`, `verify`, `seal`, `replay`, `eval`).
- Optional: containerise API and UI for Snowpark Container Services.
- Landing site links and screenshots.

---

# Demo script (5 minutes)

| Min | Show | Say |
|---|---|---|
| 0:00 | Queue with SLA clocks | "Investigators have 7 working days. Here are today's alerts." |
| 0:30 | Open a ring case; subgraph and KYC | "This is the ring the model flagged. Every row is real data from the snapshot." |
| 1:15 | Draft report; cairn stack fills | "The LLM writes claims, not prose. Each one is checked against the data." |
| 2:00 | **Inject error**; stone wobbles; draft blocked | "I changed one amount by ten percent. The verifier caught it before a human saw it." |
| 2:45 | Repair; submit; switch to approver; approve | "A different person must approve." |
| 3:30 | Filing; click a sentence; evidence drawer | "An auditor can see exactly what backs this line." |
| 4:00 | Replay; hash matches | "Replay re-runs the checks and gets the same seal." |
| 4:30 | Scoreboard | "Here is precision and recall with and without the verifier, and the catch rate on planted errors." |

Always end by stating the data is synthetic and a human approves every filing.

# Submission checklist

- [ ] Portal shows you are still able to submit; deadline confirmed
- [ ] Terms and Conditions checked for tool rules
- [ ] Repository with README (architecture, setup, scoreboard)
- [ ] `COCO_LOG.md` with prompts and outcomes
- [ ] Demo video (backup)
- [ ] Screenshots of queue, case, draft, filing, scoreboard
- [ ] Synthetic-data notice in UI and README
- [ ] No secrets in the repo; `.env.example` only
- [ ] Any submission fields the portal requires

# Risks and cut lines

| If this slips | Cut |
|---|---|
| Detector training | Smaller time slice; keep the pipeline |
| Cycle query too slow | Fan-out and fan-in only for the demo |
| Cortex JSON invalid | Stronger prompt and retry; fall back to hand-written claims for one case |
| UI polish | Keep layout; skip dark mode and the graph hover |
| Agent and Search | Skip entirely; say it is planned |
| Multi-GNN | Skip; say so |

# Definition of done (T1)

- Alert to sealed filing works end to end on at least three cases
- Verifier blocks an injected error live
- Replay hash matches; a tampered test breaks it
- Scoreboard table exists with real numbers
- README, video and checklist complete
