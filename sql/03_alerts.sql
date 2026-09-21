-- =============================================================================
-- Cairnquill: 03_alerts.sql
-- Creates CASES schema tables and trains/scores with the detector.
-- Model training driven by CoCo CLI ML skill; scoring written here.
-- =============================================================================

USE ROLE CQ_DEV;
USE WAREHOUSE CQ_WH;
USE DATABASE CAIRNQUILL_DB;

-- ── CASES tables ──────────────────────────────────────────────────────────────
CREATE OR REPLACE TABLE CASES.ALERTS (
  alert_id      NUMBER AUTOINCREMENT PRIMARY KEY,
  account_key   STRING        NOT NULL,
  score         FLOAT         NOT NULL,
  model_version STRING        NOT NULL,
  created_ts    TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  sla_due       DATE          NOT NULL,
  status        STRING        DEFAULT 'OPEN'  -- OPEN / CLOSED
)
COMMENT = 'ML detector alerts with 7-working-day SLA';

CREATE OR REPLACE TABLE CASES.CASES (
  case_id           STRING PRIMARY KEY,
  alert_id          NUMBER,
  account_key       STRING,
  typology_detected STRING,   -- CYCLE / FAN_OUT / FAN_IN (set after mining)
  status            STRING    NOT NULL,  -- see APP_FLOW.md case state machine
  maker             STRING,   -- username of investigator
  created_ts        TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  sla_due           DATE,
  updated_ts        TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
)
COMMENT = 'AML investigation cases';

CREATE OR REPLACE TABLE CASES.DRAFTS (
  draft_id       STRING PRIMARY KEY,
  case_id        STRING        NOT NULL,
  version        NUMBER        DEFAULT 1,
  claims         VARIANT       NOT NULL,  -- JSON array of CairnquillClaim
  model          STRING,                  -- Cortex model used
  prompt_version STRING,
  author         STRING        NOT NULL,
  created_ts     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
)
COMMENT = 'Claim drafts produced by Quill';

CREATE OR REPLACE TABLE CASES.VERDICTS (
  draft_id    STRING        NOT NULL,
  claim_id    STRING        NOT NULL,
  verdict     STRING        NOT NULL,  -- VERIFIED|CONTRADICTED|UNSUPPORTED|JUDGEMENT
  asserted    VARIANT,
  actual      VARIANT,
  checked_ts  TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (draft_id, claim_id)
)
COMMENT = 'Surveyor verdicts per claim';

CREATE OR REPLACE TABLE CASES.COMMENTS (
  comment_id NUMBER AUTOINCREMENT PRIMARY KEY,
  case_id    STRING NOT NULL,
  author     STRING NOT NULL,
  body       STRING NOT NULL,
  ts         TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
)
COMMENT = 'Approver rejection comments and investigator notes';

-- ── SLA helper ────────────────────────────────────────────────────────────────
-- Adds 7 working days (Mon–Fri), skipping weekends. Holidays not accounted for
-- and stated as a limitation everywhere this is shown.
CREATE OR REPLACE FUNCTION CASES.WORKING_DAY_ADD(start_date DATE, days NUMBER)
RETURNS DATE
LANGUAGE JAVASCRIPT
AS $$
  var d = new Date(START_DATE);
  var added = 0;
  while (added < DAYS) {
    d.setDate(d.getDate() + 1);
    var day = d.getDay(); // 0=Sun, 6=Sat
    if (day !== 0 && day !== 6) added++;
  }
  return d.toISOString().split('T')[0];
$$
COMMENT = 'Add N working days (Mon-Fri) to a date. Weekends skipped, holidays ignored.';

-- ── Score and write alerts ─────────────────────────────────────────────────────
-- After CoCo CLI trains and registers CQ_DETECTOR, run this to score and alert.
-- Replace 'CQ_DETECTOR' with the registered model name if different.

/*
INSERT INTO CASES.ALERTS (account_key, score, model_version, sla_due)
SELECT
  account_key,
  prediction:probability::FLOAT                        AS score,
  'v1'                                                 AS model_version,
  CASES.WORKING_DAY_ADD(CURRENT_DATE(), 7)             AS sla_due
FROM (
  SELECT
    account_key,
    SNOWFLAKE.ML.PREDICT(
      MODEL       => 'CAIRNQUILL_DB.FEATURES.CQ_DETECTOR',
      VERSION     => 1,
      INPUT       => OBJECT_CONSTRUCT(*)
    ) AS prediction
  FROM FEATURES.ACCOUNT_FEATURES
)
WHERE prediction:class = 1
  AND prediction:probability::FLOAT > 0.5
ORDER BY score DESC;
*/

-- Verification query
SELECT COUNT(*), AVG(score) AS avg_score, MIN(sla_due) AS earliest_sla
FROM CASES.ALERTS
WHERE status = 'OPEN';
