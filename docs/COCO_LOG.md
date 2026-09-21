# CoCo CLI Log

This document tracks the prompts and interactions with the Snowflake CoCo CLI used to build the ML detector, Semantic View, and Cortex Agent for Cairnquill.

## P1: ML Model Training (XGBoost)
**Goal:** Train an XGBoost model on `FEATURES.ACCOUNT_FEATURES` to detect laundering accounts.

**Prompt used:**
> Train an XGBoost binary classification model using the features in `FEATURES.ACCOUNT_FEATURES`. The label column is `IS_LAUNDERING`. Evaluate it using precision, recall, and ROC-AUC. Save the model in the Snowflake model registry as `CQ_DETECTOR` version `1`.

## P2: Semantic View for Cortex Analyst
**Goal:** Create a semantic view over `CASES.ALERTS` and `CASES.CASES` for natural language querying of case metrics.

**Prompt used:**
> Create a Semantic View in Snowflake for the tables `CASES.ALERTS` and `CASES.CASES`. Ensure it understands terms like 'open alerts', 'SLA breaches', 'active cases', and 'escalated drafts'. Name it `CQ_RISK_SV`.

## P3: Cortex Search for Regulatory Text
**Goal:** Create a Cortex Search service over `REG.CHUNKS` to allow the assistant to cite PMLA sections.

**Prompt used:**
> Create a Cortex Search service named `REG.REG_SEARCH` on the table `REG.CHUNKS`. The search column should be `CHUNK_TEXT` and include attributes `SOURCE`, `SECTION`, and `URL`.

## P4: Cortex Agent Setup
**Goal:** Set up a Cortex Agent to answer regulatory questions.

**Prompt used:**
> Configure a Cortex Agent named `CQ_ASSISTANT` that uses the `REG.REG_SEARCH` search service and the `CQ_RISK_SV` semantic view. Its role is to help investigators query regulatory guidelines and case metrics. Instruct it to always cite its sources.
