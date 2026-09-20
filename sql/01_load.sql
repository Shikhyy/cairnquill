-- =============================================================================
-- Cairnquill: 01_load.sql
-- Loads AMLworld HI-Small and synthetic KYC into RAW schema.
-- Run with CQ_DEV role. All data is SYNTHETIC.
-- Confirm CSV column names after download – the account column appears twice.
-- =============================================================================

USE ROLE CQ_DEV;
USE WAREHOUSE CQ_WH;
USE DATABASE CAIRNQUILL_DB;
USE SCHEMA RAW;

-- ── File format ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FILE FORMAT RAW.CSV_FORMAT
  TYPE            = 'CSV'
  FIELD_DELIMITER = ','
  RECORD_DELIMITER = '\n'
  SKIP_HEADER     = 1
  FIELD_OPTIONALLY_ENCLOSED_BY = '"'
  NULL_IF         = ('', 'NULL')
  DATE_FORMAT     = 'YYYY/MM/DD'
  TIMESTAMP_FORMAT = 'YYYY/MM/DD HH24:MI'
  COMMENT         = 'AMLworld HI-Small CSV format';

-- ── Stage ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE STAGE RAW.LANDING
  FILE_FORMAT = RAW.CSV_FORMAT
  COMMENT     = 'Landing zone for AMLworld CSV uploads';

-- ── Staging table ─────────────────────────────────────────────────────────────
-- Column names match HI-Small_Trans.csv header; confirm after download.
-- from_account appears as the 2nd and 4th column – rename on load.
CREATE OR REPLACE TABLE RAW.TXNS_STG (
  ts               STRING,          -- raw timestamp string
  from_bank        STRING,
  from_acct        STRING,          -- from_account (col 2, renamed)
  to_bank          STRING,
  to_acct          STRING,          -- to_account (col 4, renamed)
  amt_paid         STRING,
  paid_ccy         STRING,
  amt_received     STRING,
  recv_ccy         STRING,
  pay_format       STRING,
  is_laundering    NUMBER(1)
);

-- Copy CSV from stage (run AFTER uploading the file):
-- PUT file:///path/to/HI-Small_Trans.csv @RAW.LANDING AUTO_COMPRESS=TRUE;
COPY INTO RAW.TXNS_STG
FROM @RAW.LANDING
FILE_FORMAT = (FORMAT_NAME = 'RAW.CSV_FORMAT')
ON_ERROR = 'ABORT_STATEMENT';

-- ── Canonical TXNS with stable txn_id ─────────────────────────────────────────
-- Order by every column so ROW_NUMBER() is reproducible across loads.
CREATE OR REPLACE TABLE RAW.TXNS AS
SELECT
  ROW_NUMBER() OVER (
    ORDER BY ts, from_bank, from_acct, to_bank, to_acct,
             amt_paid::NUMBER(38,6), paid_ccy, pay_format
  )                                            AS txn_id,
  TO_TIMESTAMP_NTZ(ts, 'YYYY/MM/DD HH24:MI')  AS ts,
  from_bank || ':' || from_acct               AS src,
  to_bank   || ':' || to_acct                 AS dst,
  amt_paid::NUMBER(38,6)                       AS amt_paid,
  paid_ccy,
  amt_received::NUMBER(38,6)                   AS amt_received,
  recv_ccy,
  pay_format,
  is_laundering
FROM RAW.TXNS_STG;

-- Verification
SELECT COUNT(*), SUM(is_laundering) AS laundering_rows FROM RAW.TXNS;

-- ── KYC table ────────────────────────────────────────────────────────────────
-- Schema-only; rows inserted by scripts/generate_kyc.py
-- SYNTHETIC data – labelled clearly
CREATE OR REPLACE TABLE RAW.KYC (
  account_key             STRING        NOT NULL COMMENT 'bank:account composite key',
  customer_id             STRING        COMMENT 'SYNTHETIC',
  customer_name_synth     STRING        COMMENT 'SYNTHETIC – not a real name',
  occupation              STRING        COMMENT 'SYNTHETIC',
  declared_monthly_income NUMBER(18,2)  COMMENT 'SYNTHETIC',
  income_ccy              STRING,
  branch                  STRING        COMMENT 'SYNTHETIC',
  risk_rating             STRING        COMMENT 'SYNTHETIC – LOW/MEDIUM/HIGH',
  PRIMARY KEY (account_key)
)
COMMENT = 'SYNTHETIC KYC overlay – not real customer data';

-- ── FX rates (illustrative assumption) ───────────────────────────────────────
CREATE OR REPLACE TABLE RAW.FX_RATES (
  ccy    STRING,
  to_usd NUMBER(18,6),
  note   STRING
)
COMMENT = 'Illustrative FX rates – fixed assumption, not live data';

INSERT INTO RAW.FX_RATES VALUES
  ('USD', 1.000000,  'base'),
  ('EUR', 1.085000,  'illustrative 2024 rate'),
  ('GBP', 1.270000,  'illustrative 2024 rate'),
  ('INR', 0.012000,  'illustrative 2024 rate'),
  ('AED', 0.272000,  'illustrative 2024 rate'),
  ('SGD', 0.740000,  'illustrative 2024 rate'),
  ('HKD', 0.128000,  'illustrative 2024 rate'),
  ('MYR', 0.213000,  'illustrative 2024 rate');

-- ── Ground truth patterns ─────────────────────────────────────────────────────
CREATE OR REPLACE TABLE GT.PATTERNS (
  attempt_id STRING  COMMENT 'Laundering attempt group ID from AMLworld',
  typology   STRING  COMMENT 'CYCLE / FAN_OUT / FAN_IN / SCATTER_GATHER etc.',
  txn_id     NUMBER  COMMENT 'References RAW.TXNS.txn_id'
)
COMMENT = 'Ground-truth pattern labels – AMLworld HI-Small synthetic';

-- Parse and load from HI-Small_Patterns.txt via scripts/parse_patterns.py
-- Verify: a laundering txn_id in TXNS joins to a pattern in this table.
SELECT t.txn_id, p.typology
FROM RAW.TXNS t
JOIN GT.PATTERNS p ON t.txn_id = p.txn_id
WHERE t.is_laundering = 1
LIMIT 10;
