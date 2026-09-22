-- =============================================================================
-- Cairnquill: 05_audit.sql
-- Append-only audit trail: FILINGS and EVENTS tables.
-- CQ_APP has INSERT and SELECT only – no UPDATE or DELETE.
-- =============================================================================

USE ROLE CQ_DEV;
USE WAREHOUSE CQ_WH;
USE DATABASE CAIRNQUILL_DB;

-- ── Audit tables ──────────────────────────────────────────────────────────────
CREATE OR REPLACE TABLE AUDIT.FILINGS (
  filing_id      STRING        PRIMARY KEY,
  case_id        STRING        NOT NULL,
  draft_id       STRING        NOT NULL,
  evidence_sha   STRING        NOT NULL,  -- SHA256 of all row_sha values
  seal_sha       STRING        NOT NULL,  -- tamper-evident seal hash
  prev_seal_sha  STRING,                  -- previous filing's seal (hash chain)
  versions       VARIANT       NOT NULL,  -- {model, prompt, verifier, detector}
  maker          STRING        NOT NULL,
  approver       STRING        NOT NULL,
  approved_ts    TIMESTAMP_NTZ NOT NULL
)
COMMENT = 'Sealed, append-only filing records. No UPDATE or DELETE on this table.';

CREATE OR REPLACE TABLE AUDIT.EVENTS (
  event_id  NUMBER AUTOINCREMENT PRIMARY KEY,
  case_id   STRING        NOT NULL,
  actor     STRING        NOT NULL,
  action    STRING        NOT NULL,   -- MINE | DRAFT | VERIFY | REPAIR | SUBMIT | APPROVE | REJECT | SEAL | REPLAY
  detail    VARIANT,                  -- action-specific metadata (no KYC data)
  ts        TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
)
COMMENT = 'Immutable event log – every state change written here';

-- Eval tables
CREATE OR REPLACE TABLE EVAL.RUNS (
  run_id   STRING        PRIMARY KEY,
  kind     STRING        NOT NULL,   -- PLANTED_ERROR | SCOREBOARD | DETECTOR
  metrics  VARIANT       NOT NULL,
  ts       TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
)
COMMENT = 'Evaluation run results – precision, recall, catch rate etc.';

CREATE OR REPLACE TABLE EVAL.PLANTED (
  run_id    STRING  NOT NULL,
  claim_id  STRING  NOT NULL,
  mutation  STRING  NOT NULL,  -- AMOUNT_X1_1 | WRONG_ACCOUNT | DROP_HOP | SHIFT_WINDOW | SWAP_CCY | FABRICATED_ID
  caught    BOOLEAN NOT NULL,
  PRIMARY KEY (run_id, claim_id)
)
COMMENT = 'Per-claim planted-error results';

-- Regulatory tables
CREATE OR REPLACE TABLE REG.CHUNKS (
  chunk_id   STRING PRIMARY KEY,
  source     STRING NOT NULL,   -- e.g. PMLA_2002 | FIU_IND_CIRCULAR_2023
  section    STRING,
  url        STRING,
  chunk_text STRING NOT NULL
)
COMMENT = 'Chunked public regulatory text for Cortex Search';

CREATE OR REPLACE TABLE REG.TYPOLOGY_MAP (
  pattern_type STRING NOT NULL,  -- CYCLE | FAN_OUT | FAN_IN
  limb         STRING NOT NULL,  -- PMLA limb description
  note         STRING            -- Illustrative mapping – not legal advice
)
COMMENT = 'Illustrative typology-to-PMLA-limb mapping. NOT legal advice.';

-- Populate illustrative typology map
INSERT INTO REG.TYPOLOGY_MAP VALUES
  ('CYCLE',
   'Unusual or unjustified complexity',
   'Circular layering through multiple accounts with no clear economic rationale. Illustrative – not legal advice.'),
  ('FAN_OUT',
   'No apparent economic rationale',
   'Rapid distribution of funds to many counterparties after consolidation. Illustrative – not legal advice.'),
  ('FAN_IN',
   'Unusual magnitude relative to declared profile',
   'Concentration of funds from many sources inconsistent with declared income. Illustrative – not legal advice.');

-- ── Cortex Search service for regulatory text ─────────────────────────────────
-- Create AFTER populating REG.CHUNKS with regulatory text.
/*
CREATE OR REPLACE CORTEX SEARCH SERVICE REG.REG_SEARCH
  ON chunk_text
  ATTRIBUTES source, section, url
  WAREHOUSE  = CQ_WH
  TARGET_LAG = '1 day'
AS SELECT chunk_text, source, section, url FROM REG.CHUNKS;
*/
