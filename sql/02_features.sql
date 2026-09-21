-- =============================================================================
-- Cairnquill: 02_features.sql
-- Dynamic Table for account-level features used by the XGBoost detector.
-- Built by CoCo CLI ML skill – reviewed and committed here for traceability.
-- =============================================================================

USE ROLE CQ_DEV;
USE WAREHOUSE CQ_WH;
USE DATABASE CAIRNQUILL_DB;

-- ── Account features (Dynamic Table – incremental refresh) ────────────────────
CREATE OR REPLACE DYNAMIC TABLE FEATURES.ACCOUNT_FEATURES
  TARGET_LAG = '1 hour'
  WAREHOUSE  = CQ_WH
  COMMENT    = 'Incremental account-level AML features – SYNTHETIC data'
AS
WITH outbound AS (
  SELECT
    src                                                         AS account_key,
    COUNT(*)                                                    AS out_txns,
    COUNT(DISTINCT dst)                                         AS out_counterparties,
    SUM(amt_paid)                                               AS out_amount,
    AVG(amt_paid)                                               AS out_avg,
    MAX(amt_paid)                                               AS out_max,
    STDDEV(amt_paid)                                            AS out_stddev,
    COUNT_IF(pay_format = 'Cash')                               AS out_cash_txns,
    COUNT_IF(paid_ccy != recv_ccy)                              AS out_fx_txns,
    -- 24-hour velocity: max transactions in any 24-hour window
    MAX(COUNT(*)) OVER (
      PARTITION BY src
      ORDER BY DATE_TRUNC('day', ts)
    )                                                           AS out_daily_max
  FROM RAW.TXNS
  GROUP BY src
),
inbound AS (
  SELECT
    dst                                                         AS account_key,
    COUNT(*)                                                    AS in_txns,
    COUNT(DISTINCT src)                                         AS in_counterparties,
    SUM(amt_received)                                           AS in_amount,
    AVG(amt_received)                                           AS in_avg,
    MAX(amt_received)                                           AS in_max,
    STDDEV(amt_received)                                        AS in_stddev,
    COUNT_IF(pay_format = 'Cash')                               AS in_cash_txns
  FROM RAW.TXNS
  GROUP BY dst
),
-- Cycle participation flag: accounts that appear in 3-hop cycles
cycle_flag AS (
  SELECT DISTINCT t1.src AS account_key, 1 AS in_cycle
  FROM RAW.TXNS t1
  JOIN RAW.TXNS t2
    ON t2.src = t1.dst
   AND t2.ts BETWEEN t1.ts AND DATEADD(hour, 72, t1.ts)
  JOIN RAW.TXNS t3
    ON t3.src = t2.dst
   AND t3.dst = t1.src
   AND t3.ts BETWEEN t2.ts AND DATEADD(hour, 72, t1.ts)
  LIMIT 50000  -- guard against runaway self-join
)
SELECT
  COALESCE(o.account_key, i.account_key)              AS account_key,
  COALESCE(o.out_txns, 0)                             AS out_txns,
  COALESCE(o.out_counterparties, 0)                   AS out_counterparties,
  COALESCE(o.out_amount, 0)                           AS out_amount,
  COALESCE(o.out_avg, 0)                              AS out_avg,
  COALESCE(o.out_max, 0)                              AS out_max,
  COALESCE(o.out_stddev, 0)                           AS out_stddev,
  COALESCE(o.out_cash_txns, 0)                        AS out_cash_txns,
  COALESCE(o.out_fx_txns, 0)                          AS out_fx_txns,
  COALESCE(o.out_daily_max, 0)                        AS out_daily_max,
  COALESCE(i.in_txns, 0)                              AS in_txns,
  COALESCE(i.in_counterparties, 0)                    AS in_counterparties,
  COALESCE(i.in_amount, 0)                            AS in_amount,
  COALESCE(i.in_avg, 0)                               AS in_avg,
  COALESCE(i.in_max, 0)                               AS in_max,
  COALESCE(i.in_stddev, 0)                            AS in_stddev,
  COALESCE(i.in_cash_txns, 0)                         AS in_cash_txns,
  -- Derived ratios
  CASE WHEN COALESCE(i.in_amount, 0) > 0
    THEN COALESCE(o.out_amount, 0) / i.in_amount ELSE NULL END  AS amount_ratio,
  COALESCE(c.in_cycle, 0)                             AS in_cycle,
  -- Label: 1 if any laundering txn touches this account
  MAX(CASE WHEN t.is_laundering = 1 THEN 1 ELSE 0 END)  AS is_laundering
FROM outbound o
FULL OUTER JOIN inbound i USING (account_key)
LEFT JOIN cycle_flag c USING (account_key)
LEFT JOIN RAW.TXNS t
  ON t.src = COALESCE(o.account_key, i.account_key)
  OR t.dst = COALESCE(o.account_key, i.account_key)
GROUP BY 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19;

-- Verify feature coverage
SELECT
  COUNT(*)                       AS total_accounts,
  SUM(is_laundering)             AS laundering_accounts,
  AVG(out_txns)                  AS avg_out_txns,
  AVG(in_cycle)                  AS pct_in_cycle
FROM FEATURES.ACCOUNT_FEATURES;
