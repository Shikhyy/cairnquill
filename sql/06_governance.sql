-- =============================================================================
-- Cairnquill: 06_governance.sql
-- Masking policy on KYC fields for the auditor role.
-- =============================================================================

USE ROLE CQ_DEV;
USE DATABASE CAIRNQUILL_DB;

-- Masking policy: auditors see *** for PII KYC fields
CREATE OR REPLACE MASKING POLICY RAW.MASK_KYC_FIELD
  AS (v STRING) RETURNS STRING ->
    CASE
      WHEN CURRENT_ROLE() IN ('CQ_APP', 'CQ_DEV') THEN v
      ELSE '***'
    END
COMMENT = 'Masks KYC PII fields from auditor role';

-- Apply to KYC columns
ALTER TABLE RAW.KYC
  MODIFY COLUMN customer_name_synth SET MASKING POLICY RAW.MASK_KYC_FIELD;
ALTER TABLE RAW.KYC
  MODIFY COLUMN occupation          SET MASKING POLICY RAW.MASK_KYC_FIELD;
ALTER TABLE RAW.KYC
  MODIFY COLUMN branch              SET MASKING POLICY RAW.MASK_KYC_FIELD;

-- Verify: switch to CQ_AUDITOR and check
-- USE ROLE CQ_AUDITOR;
-- SELECT * FROM RAW.KYC LIMIT 5;  -- should show *** for masked columns
