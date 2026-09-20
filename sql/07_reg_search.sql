-- =============================================================================
-- Cairnquill: 07_reg_search.sql
-- Loads public regulatory text chunks and creates Cortex Search service.
-- Sources: public PMLA 2002 provisions (illustrative excerpts).
-- This is NOT legal advice; mapping is illustrative only.
-- =============================================================================

USE ROLE CQ_DEV;
USE WAREHOUSE CQ_WH;
USE DATABASE CAIRNQUILL_DB;
USE SCHEMA REG;

-- Insert illustrative PMLA text chunks (public domain excerpts)
-- In production: chunk actual PMLA PDF and FIU-IND circulars more finely.
INSERT INTO REG.CHUNKS (chunk_id, source, section, url, chunk_text) VALUES
('pmla-2002-s2-y',
 'PMLA_2002',
 'Section 2(y) – Suspicious Transaction Definition',
 'https://fiuindia.gov.in/files/Docs/PMLA2002.pdf',
 'Suspicious transaction means a transaction whether or not made in cash which, to a person acting in good faith: (a) gives rise to a reasonable ground of suspicion that it may involve the proceeds of crime; or (b) appears to be made in circumstances of unusual or unjustified complexity; or (c) appears to have no economic rationale or bonafide purpose; or (d) raises doubt regarding its legitimate purpose.'),

('pmla-2002-s12',
 'PMLA_2002',
 'Section 12 – Obligation to Maintain Records',
 'https://fiuindia.gov.in/files/Docs/PMLA2002.pdf',
 'Every banking company, financial institution and intermediary shall maintain a record of all transactions including information relating to the nature and value of such transactions, whether such transactions comprise of a single transaction or a series of transactions integrally connected to each other.'),

('pmla-2002-s16',
 'PMLA_2002',
 'Section 16 – Power of Survey',
 'https://fiuindia.gov.in/files/Docs/PMLA2002.pdf',
 'An authority authorised in this behalf by the Central Government by general or special order may, for the purposes of this Act, require any person to furnish information in his possession with respect to transactions.'),

('fiu-ind-str-guidance-2023-1',
 'FIU_IND_GUIDANCE',
 'STR Filing – Timing and Tipping Off',
 'https://fiuindia.gov.in',
 'Suspicious Transaction Reports shall be filed within 7 working days of forming a suspicion. Reporting entities must not tip off the customer or any other person that a report has been or is being made. Communications related to suspicious transactions should be handled with strict confidentiality.'),

('fiu-ind-str-guidance-2023-2',
 'FIU_IND_GUIDANCE',
 'STR Content Requirements',
 'https://fiuindia.gov.in',
 'An STR should include: (i) KYC profile and identification details of the account holder, (ii) complete transaction details including dates, amounts, currencies and counterparties, (iii) grounds of suspicion – explaining why the transaction is suspicious with reference to specific indicators. Narrative should be factual and supported by evidence.'),

('fiu-ind-typology-2023-cycle',
 'FIU_IND_TYPOLOGIES',
 'Typology – Circular Layering',
 'https://fiuindia.gov.in',
 'Circular layering involves moving funds through a series of accounts in a circle, often across multiple banks or jurisdictions, to obscure the origin. Indicators include: transactions returning funds to the originating account within a short time frame, no apparent economic purpose for the intermediary transfers, and amounts that are roughly equivalent after accounting for fees.'),

('fiu-ind-typology-2023-smurfing',
 'FIU_IND_TYPOLOGIES',
 'Typology – Smurfing / Structuring',
 'https://fiuindia.gov.in',
 'Smurfing (structuring) involves breaking large amounts into smaller transactions below reporting thresholds. Fan-out patterns where one account distributes to many smaller accounts, and fan-in patterns where many smaller accounts consolidate into one, are common indicators. The lack of legitimate business rationale is a key suspicious indicator.');

-- Create Cortex Search service after chunks are loaded
-- Uncomment when account supports Cortex Search:
/*
CREATE OR REPLACE CORTEX SEARCH SERVICE REG.REG_SEARCH
  ON chunk_text
  ATTRIBUTES source, section, url
  WAREHOUSE  = CQ_WH
  TARGET_LAG = '1 day'
AS SELECT chunk_text, source, section, url FROM REG.CHUNKS;
*/

-- Verify
SELECT source, section, LENGTH(chunk_text) AS chars FROM REG.CHUNKS ORDER BY source;
