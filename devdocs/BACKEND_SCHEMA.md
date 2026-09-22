# Cairnquill: Backend and Schema

Covers the Snowflake objects, DDL, roles, API, claim schema, verifier, seal, Cortex usage and tests. Syntax for Cortex features changes quickly, so confirm against current Snowflake docs before running.

## 1. Responsibilities

| Component | Does | Does not |
|---|---|---|
| Snowflake | Stores data, snapshots, audit; trains and registers the detector; runs Cortex LLM; hosts Semantic View, Agent, Search | Decide filing outcomes |
| API (FastAPI) | Orchestrates mining, drafting, verifying, sealing; enforces state and role rules | Call an LLM to judge numbers |
| Core library | Pure, tested logic: claim schema, verify, repair, recall, seal | Hold secrets or UI logic |

## 2. Database layout

```
CAIRNQUILL_DB
  RAW        TXNS_STG, TXNS, KYC, FX_RATES
  GT         PATTERNS
  FEATURES   ACCOUNT_FEATURES (Dynamic Table)
  CASES      ALERTS, CASES, DRAFTS, VERDICTS, COMMENTS
  EVIDENCE   CAIRNS, CASE_ROWS
  AUDIT      FILINGS, EVENTS
  EVAL       RUNS, PLANTED
  REG        CHUNKS, TYPOLOGY_MAP   (+ Cortex Search service REG_SEARCH)
```

## 3. Setup and roles

```sql
CREATE DATABASE IF NOT EXISTS CAIRNQUILL_DB;
CREATE WAREHOUSE IF NOT EXISTS CQ_WH WAREHOUSE_SIZE='XSMALL' AUTO_SUSPEND=60 AUTO_RESUME=TRUE;
CREATE RESOURCE MONITOR CQ_RM WITH CREDIT_QUOTA=20
  TRIGGERS ON 80 PERCENT DO NOTIFY ON 100 PERCENT DO SUSPEND;
ALTER WAREHOUSE CQ_WH SET RESOURCE_MONITOR=CQ_RM;

CREATE ROLE IF NOT EXISTS CQ_DEV;       -- builders and CoCo CLI
CREATE ROLE IF NOT EXISTS CQ_APP;       -- API runtime
CREATE ROLE IF NOT EXISTS CQ_AUDITOR;   -- read-only, masked KYC
```

Grants (summary):
- `CQ_DEV`: `ALL` on `CAIRNQUILL_DB` schemas, `USAGE` on `CQ_WH`, `USAGE` on the Cortex database role (`SNOWFLAKE.CORTEX_USER`).
- `CQ_APP`: `SELECT` on `RAW`, `FEATURES`, `GT`, `REG`; `SELECT, INSERT, UPDATE` on `CASES` and `EVIDENCE`; **`INSERT` and `SELECT` only on `AUDIT.FILINGS` and `AUDIT.EVENTS`**; `USAGE` on the model and Cortex features it calls.
- `CQ_AUDITOR`: `SELECT` on `AUDIT`, `CASES`, `EVIDENCE`, `EVAL`; KYC through masking.

Never use `ACCOUNTADMIN` for the app or for CoCo.

## 4. Tables (DDL)

```sql
-- RAW
CREATE OR REPLACE TABLE RAW.TXNS (
  txn_id        NUMBER        NOT NULL,
  ts            TIMESTAMP_NTZ NOT NULL,
  src           STRING        NOT NULL,   -- from_bank || ':' || from_account
  dst           STRING        NOT NULL,   -- to_bank   || ':' || to_account
  amt_paid      NUMBER(38,6),
  paid_ccy      STRING,
  amt_received  NUMBER(38,6),
  recv_ccy      STRING,
  pay_format    STRING,
  is_laundering NUMBER(1),
  PRIMARY KEY (txn_id)
);

CREATE OR REPLACE TABLE RAW.KYC (          -- SYNTHETIC
  account_key             STRING PRIMARY KEY,
  customer_id             STRING,
  customer_name_synth     STRING,
  occupation              STRING,
  declared_monthly_income NUMBER(18,2),
  income_ccy              STRING,
  branch                  STRING,
  risk_rating             STRING
);

CREATE OR REPLACE TABLE RAW.FX_RATES (ccy STRING, to_usd NUMBER(18,6), note STRING);  -- illustrative

CREATE OR REPLACE TABLE GT.PATTERNS (
  attempt_id STRING, typology STRING, txn_id NUMBER
);
```

Load order: stage the CSV, `COPY INTO RAW.TXNS_STG`, then build `RAW.TXNS` ordering by **every** column so `txn_id` is reproducible. Amounts are loaded as `NUMBER(38,6)` so sums are exact. Check the CSV header names after download. The account number column appears twice, so rename them on load.

```sql
CREATE OR REPLACE TABLE RAW.TXNS AS
SELECT ROW_NUMBER() OVER (ORDER BY ts, from_bank, from_acct, to_bank, to_acct,
                                   amt_paid, paid_ccy, pay_format) AS txn_id,
       TO_TIMESTAMP_NTZ(ts,'YYYY/MM/DD HH24:MI') AS ts,
       from_bank||':'||from_acct AS src, to_bank||':'||to_acct AS dst,
       amt_paid::NUMBER(38,6), paid_ccy, amt_received::NUMBER(38,6), recv_ccy,
       pay_format, is_laundering
FROM RAW.TXNS_STG;
```

```sql
-- FEATURES: incremental, Snowflake-native
CREATE OR REPLACE DYNAMIC TABLE FEATURES.ACCOUNT_FEATURES
  TARGET_LAG='1 hour' WAREHOUSE=CQ_WH AS
SELECT src AS account_key,
       COUNT(*)                       AS out_txns,
       COUNT(DISTINCT dst)            AS out_counterparties,
       SUM(amt_paid)                  AS out_amount,
       AVG(amt_paid)                  AS out_avg,
       MAX(amt_paid)                  AS out_max,
       COUNT_IF(pay_format='Cash')    AS out_cash_txns   -- verify value spelling in data
FROM RAW.TXNS GROUP BY src;
-- Add in-degree, 24-hour velocity and cycle-participation features via CoCo.
```

```sql
-- CASES
CREATE OR REPLACE TABLE CASES.ALERTS (
  alert_id      NUMBER AUTOINCREMENT PRIMARY KEY,
  account_key   STRING, score FLOAT, model_version STRING,
  created_ts    TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  sla_due       DATE
);
CREATE OR REPLACE TABLE CASES.CASES (
  case_id STRING PRIMARY KEY, alert_id NUMBER, account_key STRING,
  typology_detected STRING, status STRING, maker STRING,
  created_ts TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(), sla_due DATE
);
CREATE OR REPLACE TABLE CASES.DRAFTS (
  draft_id STRING PRIMARY KEY, case_id STRING, version NUMBER,
  claims VARIANT, model STRING, prompt_version STRING,
  author STRING, created_ts TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);
CREATE OR REPLACE TABLE CASES.VERDICTS (
  draft_id STRING, claim_id STRING, verdict STRING,  -- VERIFIED|CONTRADICTED|UNSUPPORTED|JUDGEMENT
  asserted VARIANT, actual VARIANT, checked_ts TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);
CREATE OR REPLACE TABLE CASES.COMMENTS (case_id STRING, author STRING, body STRING, ts TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP());

-- EVIDENCE
CREATE OR REPLACE TABLE EVIDENCE.CAIRNS (
  cairn_id STRING PRIMARY KEY, case_id STRING, pattern_type STRING,  -- CYCLE|FAN_OUT|FAN_IN
  params VARIANT, txn_ids ARRAY, summary VARIANT,
  created_ts TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);
CREATE OR REPLACE TABLE EVIDENCE.CASE_ROWS (
  case_id STRING, cairn_id STRING, txn_id NUMBER, ts TIMESTAMP_NTZ, src STRING, dst STRING,
  amt_paid NUMBER(38,6), paid_ccy STRING, amt_received NUMBER(38,6), recv_ccy STRING,
  pay_format STRING, row_sha STRING
);

-- AUDIT (append-only by grants)
CREATE OR REPLACE TABLE AUDIT.FILINGS (
  filing_id STRING PRIMARY KEY, case_id STRING, draft_id STRING,
  evidence_sha STRING, seal_sha STRING, prev_seal_sha STRING,
  versions VARIANT,             -- model, prompt, verifier, detector
  maker STRING, approver STRING, approved_ts TIMESTAMP_NTZ
);
CREATE OR REPLACE TABLE AUDIT.EVENTS (
  event_id NUMBER AUTOINCREMENT, case_id STRING, actor STRING, action STRING,
  detail VARIANT, ts TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- EVAL
CREATE OR REPLACE TABLE EVAL.RUNS (run_id STRING, kind STRING, metrics VARIANT, ts TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP());
CREATE OR REPLACE TABLE EVAL.PLANTED (run_id STRING, claim_id STRING, mutation STRING, caught BOOLEAN);

-- REG
CREATE OR REPLACE TABLE REG.CHUNKS (chunk_id STRING, source STRING, section STRING, url STRING, chunk_text STRING);
CREATE OR REPLACE TABLE REG.TYPOLOGY_MAP (pattern_type STRING, limb STRING, note STRING);  -- illustrative, not legal advice
```

`row_sha` is a hash of each snapshot row, used when computing `evidence_sha`.

## 5. Governance

```sql
CREATE OR REPLACE MASKING POLICY RAW.MASK_KYC_FIELD AS (v STRING) RETURNS STRING ->
  CASE WHEN CURRENT_ROLE() IN ('CQ_APP','CQ_DEV') THEN v ELSE '***' END;
ALTER TABLE RAW.KYC MODIFY COLUMN customer_name_synth SET MASKING POLICY RAW.MASK_KYC_FIELD;
```

Append-only is enforced by grants (no `UPDATE` or `DELETE` for the app role) plus a hash chain (`prev_seal_sha`). A broken chain is detectable by recomputing from the first filing.

## 6. Evidence miner

Anchored on one account and bounded by time, so joins stay small. Parameters are bind variables.

```sql
-- CYCLE (3 hops, within 72h)
SELECT t1.txn_id a, t2.txn_id b, t3.txn_id c
FROM RAW.TXNS t1
JOIN RAW.TXNS t2 ON t2.src=t1.dst AND t2.ts BETWEEN t1.ts AND DATEADD(hour,72,t1.ts)
JOIN RAW.TXNS t3 ON t3.src=t2.dst AND t3.dst=t1.src
                AND t3.ts BETWEEN t2.ts AND DATEADD(hour,72,t1.ts)
WHERE t1.src = :acct LIMIT 200;

-- FAN_OUT (group by currency)
SELECT src, paid_ccy, COUNT(DISTINCT dst) n_dst, SUM(amt_paid) total, MIN(ts) t_min, MAX(ts) t_max
FROM RAW.TXNS WHERE src=:acct AND ts BETWEEN :t0 AND :t1
GROUP BY src, paid_ccy HAVING COUNT(DISTINCT dst) >= 5;
```

FAN_IN mirrors FAN_OUT on `dst`. After matching, insert the rows into `EVIDENCE.CASE_ROWS` with a `case_id` and `cairn_id`, and write the `EVIDENCE.CAIRNS` row.

## 7. Claim schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CairnquillClaim",
  "type": "object",
  "required": ["claim_id", "type", "text", "evidence_ids"],
  "properties": {
    "claim_id": {"type": "string"},
    "type": {"enum": ["SUM_AMOUNT","COUNT_TXNS","DISTINCT_COUNTERPARTIES",
                      "TIME_SPAN_HOURS","PATTERN_EXISTS","KYC_MISMATCH","JUDGEMENT"]},
    "text": {"type": "string"},
    "params": {"type": "object"},
    "asserted": {"type": "object", "properties": {"value": {"type": ["number","string"]}}},
    "evidence_ids": {"type": "array", "items": {"type": "integer"}}
  }
}
```

Rules:
- `SUM_AMOUNT` must include `params.currency`.
- `JUDGEMENT` needs no `asserted` and is displayed as analyst judgement.
- Unknown types fail validation.

## 8. Verifier

SQL templates run against `EVIDENCE.CASE_ROWS` only, never `RAW`.

| Type | Template (summary) | Tolerance |
|---|---|---|
| SUM_AMOUNT | `SUM(amt_paid)` where `case_id`, `paid_ccy`, `txn_id IN (…)` | 0.01 absolute |
| COUNT_TXNS | `COUNT(*)` | exact |
| DISTINCT_COUNTERPARTIES | `COUNT(DISTINCT dst)` | exact |
| TIME_SPAN_HOURS | `DATEDIFF('hour', MIN(ts), MAX(ts))` | exact |
| PATTERN_EXISTS | Re-run the Cairn query for the case and compare the row set | exact set |
| KYC_MISMATCH | Inflow in a window versus declared income using `RAW.FX_RATES` | stated ratio |

Algorithm:

```
for claim in draft.claims:
    if claim.type == JUDGEMENT: verdict = JUDGEMENT; continue
    if any(id not in snapshot(case)): verdict = UNSUPPORTED; continue
    actual = run_template(claim.type, params, evidence_ids)   # bind variables only
    verdict = VERIFIED if within_tolerance(actual, asserted) else CONTRADICTED
draft.blocked = any(v in {CONTRADICTED, UNSUPPORTED})
```

**Recall check:** each pattern has required facts (members, total, window). Missing facts are returned as `omissions` and shown to the user, but do not block.

**Repair loop:** for failed claims, send `{claim, actual}` back to Quill. Maximum 2 rounds, then status `ESCALATED`.

## 9. Quill (drafting with Cortex)

Input to the model: a compact JSON of evidence facts (IDs, accounts, amounts, currencies, times, pattern). Prompt rules, kept in `quill/prompts/` and versioned:

- Output JSON only, matching the claim schema.
- Assert only numbers present in the evidence.
- Cite evidence IDs for every claim.
- Label opinions as `JUDGEMENT`.
- Never write customer-facing text.

```sql
SELECT AI_COMPLETE(
  model  => :model,
  prompt => :prompt
  -- add response_format / structured output if supported in your account
) AS out;
```

If the call fails or returns invalid JSON, retry once, then return a clear error. If `AI_COMPLETE` is unavailable, use `SNOWFLAKE.CORTEX.COMPLETE`. Do not hardcode a model name; read it from `CORTEX_MODEL`.

## 10. Seal and replay

```python
def seal(case_id, evidence_rows, claims, verdicts, versions, prev_seal):
    payload = {
        "case": case_id,
        "evidence": sha256(canonical(sorted(row_sha(r) for r in evidence_rows))),
        "claims": claims,
        "verdicts": [(v.claim_id, v.verdict) for v in verdicts],
        "versions": versions,       # model, prompt, verifier, detector
        "prev": prev_seal,
    }
    return sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
```

- No timestamps in the payload.
- Replay does not regenerate LLM text. It loads stored claims and the snapshot, re-runs the verifier, recomputes the hash and compares.
- Chain: each filing stores `prev_seal_sha`, so inserting or editing history breaks the chain.
- Maker-checker: reject if `approver == maker`.

## 11. Detector

- Model: XGBoost on `FEATURES.ACCOUNT_FEATURES`, trained with a **time-based** split and class weighting, registered as `CQ_DETECTOR` with a version.
- Report PR-AUC, minority-class F1 and recall at a fixed alert budget (for example the top 0.5% of accounts).
- Write `CASES.ALERTS` with `model_version` and `sla_due` (7 working days, weekends skipped, holidays ignored and stated).
- T3: Multi-GNN scores imported to a table, same alert flow.

## 12. API

Base path `/api`. JSON in and out. Every write logs to `AUDIT.EVENTS`.

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/alerts` | any | List alerts with SLA |
| POST | `/cases` | investigator | Create case from alert |
| GET | `/cases/{id}` | any | Case with status, KYC, cairns |
| POST | `/cases/{id}/mine` | investigator | Run evidence miner and snapshot |
| POST | `/cases/{id}/draft` | investigator | Quill drafts claims |
| POST | `/cases/{id}/verify` | investigator | Surveyor verdicts |
| POST | `/cases/{id}/repair` | investigator | Repair failed claims |
| PATCH | `/cases/{id}/claims/{claim_id}` | investigator | Edit a claim by hand |
| POST | `/cases/{id}/submit` | investigator | Move to `SUBMITTED` (blocked if any failed claim) |
| POST | `/cases/{id}/approve` | approver | Approve (rejects self-approval) and seal |
| POST | `/cases/{id}/reject` | approver | Reject with comment |
| GET | `/filings` | any | List filings |
| GET | `/filings/{id}` | any | Filing with claims and evidence links |
| POST | `/filings/{id}/replay` | any | Replay and compare hash |
| POST | `/demo/inject-error` | dev | Mutate a claim copy (demo mode) |
| POST | `/eval/plant-errors` | dev, auditor | Run planted-error suite |
| GET | `/eval/scoreboard` | any | Latest metrics |
| POST | `/ask` | any | Cortex Agent question |

Example verify response:

```json
{
  "case_id": "case_0142",
  "draft_id": "d_0007",
  "blocked": true,
  "verdicts": [
    {"claim_id": "c1", "verdict": "VERIFIED"},
    {"claim_id": "c3", "verdict": "CONTRADICTED",
     "asserted": {"value": 1375000}, "actual": {"value": 1250000}}
  ],
  "omissions": ["time_window"]
}
```

Errors use `{ "error": { "code": "...", "message": "...", "hint": "..." } }`. Codes: `STATE_INVALID`, `SELF_APPROVAL`, `DRAFT_BLOCKED`, `LLM_INVALID_JSON`, `SNAPSHOT_MISSING`, `SEAL_MISMATCH`, `SNOWFLAKE_UNAVAILABLE`.

## 13. Cortex Agent, Semantic View and Search (T2)

- **Semantic View `CQ_RISK_SV`** over `CASES.ALERTS`, `CASES.CASES`, `AUDIT.FILINGS`. Example metrics: open alerts, overdue cases, average hours to draft, blocked drafts. Add verified queries for the questions you demo. Build with CoCo's semantic-view skill.
- **Cortex Search `REG.REG_SEARCH`** over `REG.CHUNKS` (public PMLA and FIU-IND text you collect and chunk). Return the source and section with each passage.
- **Cortex Agent `CQ_ASSISTANT`** with tools: Cortex Analyst on the Semantic View and Cortex Search. System instruction: answer only from tool results, cite the source, otherwise say you could not find it.
- The agent is a helper. It is **not** in the filing path.

```sql
CREATE OR REPLACE CORTEX SEARCH SERVICE REG.REG_SEARCH
  ON chunk_text ATTRIBUTES source, section, url
  WAREHOUSE = CQ_WH TARGET_LAG = '1 day'
AS SELECT chunk_text, source, section, url FROM REG.CHUNKS;
```

## 14. Planted-error harness

Take verified claims and apply mutations: amount ×1.1, wrong account, drop a hop, shifted window, swapped currency, fabricated transaction ID. Record `caught` per mutation in `EVAL.PLANTED`. Metrics: catch rate, false-block rate on unmutated claims, precision and recall with and without the verifier, typology match against `GT.PATTERNS`, replay hash match over 100 cases.

## 15. Tests (minimum)

| Test | Asserts |
|---|---|
| Template per claim type | Correct value on a fixture snapshot |
| Fabricated evidence ID | `UNSUPPORTED` |
| Currency swap | `CONTRADICTED` |
| Block rule | Submit returns `DRAFT_BLOCKED` when any claim fails |
| Self-approval | Returns `SELF_APPROVAL` |
| Seal determinism | Same input gives same hash; changing one claim changes it |
| Chain | Editing an old filing breaks replay |
| Planted errors | Catch rate at or above target on the fixture set |

## 16. Observability

Log request ID, case ID, actor, action and duration. Do not log claim text containing KYC data or any secret. Show Snowflake query IDs in the evidence drawer so reviewers can trace a verdict.
