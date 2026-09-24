-- =============================================================================
-- Cairnquill: 04_evidence.sql
-- Evidence schema, miner stored procedures for cycle/fan-out/fan-in patterns.
-- All queries use bind variables and bounded time windows.
-- =============================================================================

USE ROLE CQ_DEV;
USE WAREHOUSE CQ_WH;
USE DATABASE CAIRNQUILL_DB;

-- ── Evidence tables ──────────────────────────────────────────────────────────
CREATE OR REPLACE TABLE EVIDENCE.CAIRNS (
  cairn_id     STRING        PRIMARY KEY,
  case_id      STRING        NOT NULL,
  pattern_type STRING        NOT NULL,  -- CYCLE | FAN_OUT | FAN_IN
  params       VARIANT       NOT NULL,  -- {account_key, window_hours, ...}
  txn_ids      ARRAY         NOT NULL,  -- ordered list of txn_ids in the pattern
  summary      VARIANT       NOT NULL,  -- {total_amount, currencies, counterparties, ...}
  created_ts   TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
)
COMMENT = 'Immutable evidence cairns – one per detected pattern per case';

CREATE OR REPLACE TABLE EVIDENCE.CASE_ROWS (
  case_id      STRING        NOT NULL,
  cairn_id     STRING        NOT NULL,
  txn_id       NUMBER        NOT NULL,
  ts           TIMESTAMP_NTZ NOT NULL,
  src          STRING        NOT NULL,
  dst          STRING        NOT NULL,
  amt_paid     NUMBER(38,6),
  paid_ccy     STRING,
  amt_received NUMBER(38,6),
  recv_ccy     STRING,
  pay_format   STRING,
  row_sha      STRING        NOT NULL  -- SHA256(case_id||cairn_id||txn_id||amt_paid||paid_ccy)
)
COMMENT = 'Snapshot of transaction rows per case – immutable evidence';

-- ── Evidence miner stored procedure ──────────────────────────────────────────
-- Parameters are bound; no string interpolation of user input.
-- Anchored on one account, bounded by time window to keep joins small.
CREATE OR REPLACE PROCEDURE EVIDENCE.MINE_EVIDENCE(
  p_case_id    STRING,
  p_account    STRING,
  p_window_h   NUMBER  -- hours to look back from now
)
RETURNS VARIANT
LANGUAGE SQL
AS
$$
DECLARE
  v_cairn_id STRING;
  v_result   VARIANT;
  v_t0       TIMESTAMP_NTZ;
  v_t1       TIMESTAMP_NTZ;
BEGIN
  v_t1 := CURRENT_TIMESTAMP();
  v_t0 := DATEADD(hour, -p_window_h, v_t1);

  -- ── CYCLE (3-hop within 72h) ───────────────────────────────────────────────
  LET cycle_rows RESULTSET := (
    SELECT DISTINCT t1.txn_id AS a, t2.txn_id AS b, t3.txn_id AS c,
           t1.src, t2.src AS hop2, t3.src AS hop3,
           t1.amt_paid, t1.paid_ccy
    FROM CAIRNQUILL_DB.RAW.TXNS t1
    JOIN CAIRNQUILL_DB.RAW.TXNS t2
      ON t2.src = t1.dst
     AND t2.ts BETWEEN t1.ts AND DATEADD(hour, 72, t1.ts)
    JOIN CAIRNQUILL_DB.RAW.TXNS t3
      ON t3.src = t2.dst
     AND t3.dst = t1.src
     AND t3.ts BETWEEN t2.ts AND DATEADD(hour, 72, t1.ts)
    WHERE t1.src = :p_account
      AND t1.ts BETWEEN :v_t0 AND :v_t1
    LIMIT 200
  );

  FOR row IN cycle_rows DO
    v_cairn_id := 'CAIRN-' || :p_case_id || '-CYCLE-' || row.a || '-' || row.b || '-' || row.c;

    -- Insert cairn record
    INSERT INTO EVIDENCE.CAIRNS (cairn_id, case_id, pattern_type, params, txn_ids, summary)
    SELECT
      :v_cairn_id,
      :p_case_id,
      'CYCLE',
      OBJECT_CONSTRUCT('account_key', :p_account, 'window_hours', 72, 'hop1', row.a, 'hop2', row.b, 'hop3', row.c),
      ARRAY_CONSTRUCT(row.a, row.b, row.c),
      OBJECT_CONSTRUCT(
        'n_txns', 3,
        'currency', row.paid_ccy,
        'total_paid', (SELECT SUM(amt_paid) FROM CAIRNQUILL_DB.RAW.TXNS WHERE txn_id IN (row.a, row.b, row.c))
      );

    -- Snapshot rows
    INSERT INTO EVIDENCE.CASE_ROWS
    SELECT
      :p_case_id, :v_cairn_id, txn_id, ts, src, dst,
      amt_paid, paid_ccy, amt_received, recv_ccy, pay_format,
      SHA2(CONCAT(:p_case_id, '|', :v_cairn_id, '|', txn_id::STRING, '|', COALESCE(amt_paid::STRING,''), '|', COALESCE(paid_ccy,'')), 256)
    FROM CAIRNQUILL_DB.RAW.TXNS
    WHERE txn_id IN (row.a, row.b, row.c);
  END FOR;

  -- ── FAN_OUT (≥5 distinct destinations) ────────────────────────────────────
  LET fanout_rows RESULTSET := (
    SELECT src, paid_ccy,
           COUNT(DISTINCT dst) AS n_dst,
           SUM(amt_paid)       AS total,
           ARRAY_AGG(txn_id)   AS txn_ids,
           MIN(ts)             AS t_min,
           MAX(ts)             AS t_max
    FROM CAIRNQUILL_DB.RAW.TXNS
    WHERE src = :p_account
      AND ts BETWEEN :v_t0 AND :v_t1
    GROUP BY src, paid_ccy
    HAVING COUNT(DISTINCT dst) >= 5
  );

  FOR row IN fanout_rows DO
    v_cairn_id := 'CAIRN-' || :p_case_id || '-FANOUT-' || row.paid_ccy;

    INSERT INTO EVIDENCE.CAIRNS (cairn_id, case_id, pattern_type, params, txn_ids, summary)
    VALUES (
      :v_cairn_id, :p_case_id, 'FAN_OUT',
      OBJECT_CONSTRUCT('account_key', :p_account, 'currency', row.paid_ccy, 'window_hours', :p_window_h),
      row.txn_ids,
      OBJECT_CONSTRUCT('n_dst', row.n_dst, 'total', row.total, 'currency', row.paid_ccy, 't_min', row.t_min::STRING, 't_max', row.t_max::STRING)
    );

    INSERT INTO EVIDENCE.CASE_ROWS
    SELECT
      :p_case_id, :v_cairn_id, txn_id, ts, src, dst,
      amt_paid, paid_ccy, amt_received, recv_ccy, pay_format,
      SHA2(CONCAT(:p_case_id, '|', :v_cairn_id, '|', txn_id::STRING, '|', COALESCE(amt_paid::STRING,''), '|', COALESCE(paid_ccy,'')), 256)
    FROM CAIRNQUILL_DB.RAW.TXNS
    WHERE src = :p_account
      AND ts BETWEEN :v_t0 AND :v_t1
      AND paid_ccy = row.paid_ccy;
  END FOR;

  -- ── FAN_IN (≥5 distinct sources sending to this account) ──────────────────
  LET fanin_rows RESULTSET := (
    SELECT dst, recv_ccy,
           COUNT(DISTINCT src) AS n_src,
           SUM(amt_received)   AS total,
           ARRAY_AGG(txn_id)   AS txn_ids,
           MIN(ts)             AS t_min,
           MAX(ts)             AS t_max
    FROM CAIRNQUILL_DB.RAW.TXNS
    WHERE dst = :p_account
      AND ts BETWEEN :v_t0 AND :v_t1
    GROUP BY dst, recv_ccy
    HAVING COUNT(DISTINCT src) >= 5
  );

  FOR row IN fanin_rows DO
    v_cairn_id := 'CAIRN-' || :p_case_id || '-FANIN-' || row.recv_ccy;

    INSERT INTO EVIDENCE.CAIRNS (cairn_id, case_id, pattern_type, params, txn_ids, summary)
    VALUES (
      :v_cairn_id, :p_case_id, 'FAN_IN',
      OBJECT_CONSTRUCT('account_key', :p_account, 'currency', row.recv_ccy, 'window_hours', :p_window_h),
      row.txn_ids,
      OBJECT_CONSTRUCT('n_src', row.n_src, 'total', row.total, 'currency', row.recv_ccy, 't_min', row.t_min::STRING, 't_max', row.t_max::STRING)
    );

    INSERT INTO EVIDENCE.CASE_ROWS
    SELECT
      :p_case_id, :v_cairn_id, txn_id, ts, src, dst,
      amt_paid, paid_ccy, amt_received, recv_ccy, pay_format,
      SHA2(CONCAT(:p_case_id, '|', :v_cairn_id, '|', txn_id::STRING, '|', COALESCE(amt_received::STRING,''), '|', COALESCE(recv_ccy,'')), 256)
    FROM CAIRNQUILL_DB.RAW.TXNS
    WHERE dst = :p_account
      AND ts BETWEEN :v_t0 AND :v_t1
      AND recv_ccy = row.recv_ccy;
  END FOR;

  -- Return summary
  SELECT OBJECT_CONSTRUCT(
    'case_id',    :p_case_id,
    'account',    :p_account,
    'cairns',     COUNT(*),
    'rows',       (SELECT COUNT(*) FROM EVIDENCE.CASE_ROWS WHERE case_id = :p_case_id)
  ) INTO v_result
  FROM EVIDENCE.CAIRNS WHERE case_id = :p_case_id;

  RETURN v_result;
END;
$$
COMMENT = 'Mine cycle, fan-out and fan-in evidence for a case. Bind variables only.';

-- Test call (replace with a real account key after loading data):
-- CALL EVIDENCE.MINE_EVIDENCE('case_0001', 'BANK_A:12345678', 168);
