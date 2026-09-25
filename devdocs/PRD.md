# Cairnquill: Product Requirements Document

| | |
|---|---|
| Version | 0.1 (draft) |
| Date | 2026-10-04 |
| Event | CoCo CLI Hackathon, GCC Edition (Problem 1: Risk, Fraud and Regulatory Intelligence Copilot) |
| One-liner | A marker behind every line. Cairnquill checks every claim an LLM writes against your SQL data, blocks what doesn't hold up, and seals the result so an auditor can replay it. |

> **Deadline note.** The event page lists 4 Oct 2026 as the last day for prototype submissions. Confirm on the portal that you can still submit, and read the event Terms and Conditions to confirm which AI coding tools are allowed. Build the Snowflake side visibly with Snowflake CoCo CLI.

---

## 1. Problem

A bank or NBFC financial-crime team must turn a suspicious alert into a defensible Suspicious Transaction Report (STR) for FIU-IND. Public guidance says reports are due within 7 working days of forming suspicion, and customers must never be tipped off.

Three things hurt today:

1. **Writing is slow.** Investigators pull rows from several systems and hand-write a narrative under a deadline.
2. **LLM drafting is risky.** One invented amount, date or account link in a regulatory filing is a serious problem. Fluent text is not faithful text.
3. **Nobody can prove it afterwards.** An auditor asking "how do you know this is true?" months later gets "the AI wrote it".

## 2. Solution

Cairnquill is a Snowflake-native pipeline plus a small developer toolkit.

1. **Detector** flags suspicious accounts in synthetic transaction data.
2. **Cairns (evidence miner)** pulls the exact transactions behind a pattern and freezes them as an immutable snapshot.
3. **Quill (claim compiler)** has an LLM draft the report as typed claims, each citing evidence IDs.
4. **Surveyor (verifier)** re-checks each claim with deterministic SQL. Any contradicted or unsupported claim blocks the draft.
5. **Waymark (seal)** hashes evidence, claims and verdicts into a tamper-evident audit record that can be replayed.
6. **Human approval** (maker-checker) is required before anything is sealed as filed.

**Design rule:** facts come from SQL; the LLM only writes around them. Numbers are never judged by an LLM.

## 3. Users

| Persona | Role in product | Needs |
|---|---|---|
| AML Investigator | Maker | Fast, accurate drafts. See why an account was flagged. Fix blocked claims quickly. |
| Principal Officer / Approver | Checker | Confidence that every statement was checked. Cannot approve own drafts. |
| Internal Auditor | Read-only | Click any sentence and see its evidence. Replay any filing and get the same hash. |
| Developer | SDK / CLI user | Drop the verifier into any SQL-backed LLM workflow. |

## 4. Goals and non-goals

**Goals**
- G1. Demonstrate an end-to-end path from alert to sealed report, fully on Snowflake.
- G2. Show measured trust: claim precision and recall with and without the verifier.
- G3. Show a live demo where an injected error is caught and blocked.
- G4. Package the verifier so it is reusable beyond AML.
- G5. Make it look and feel like a polished product.

**Non-goals**
- Real customer data, real filing to FIU-IND, or any claim of regulatory approval.
- Fully automated filing. A human always approves.
- Drafting customer-facing communication (tipping-off risk).
- Beating state-of-the-art detection. Detection is a credible baseline, not the contribution.

## 5. Scope tiers

| Tier | Contents |
|---|---|
| **T1 (must ship)** | Data load, stable transaction IDs, XGBoost detector, evidence miner (cycle, fan-out, fan-in), claim compiler, SQL verifier, repair loop, seal and replay, planted-error scoreboard, minimal UI |
| **T2** | Polished UI, maker-checker roles, Semantic View and Cortex Agent for natural-language questions, Cortex Search over public regulatory text, masking policies, SLA clock |
| **T3** | Multi-GNN detector, scatter-gather pattern, SPCS deployment, CLI and SDK packaging, landing site, GitHub Action |

## 6. User stories

- As an investigator, I see a queue of alerts sorted by score and SLA so I work the most urgent first.
- As an investigator, I open a case and see the transaction subgraph and KYC context in one place.
- As an investigator, I click "Draft report" and get claims linked to evidence, not loose prose.
- As an investigator, I see exactly which claim failed and why, and I can repair it in one click.
- As an approver, I can only approve drafts written by someone else, and only if no claim is contradicted or unsupported.
- As an auditor, I click any sentence in a filed report and see the transactions and query behind it.
- As an auditor, I press Replay and see the seal hash match, or a tamper warning if not.
- As a developer, I run `cairnquill verify` on my own data and get the same verdicts.

## 7. Functional requirements

| ID | Requirement | Tier |
|---|---|---|
| FR-01 | Load AMLworld HI-Small into Snowflake with a stable `txn_id` and an account key of bank plus account | T1 |
| FR-02 | Generate a synthetic KYC table clearly labelled synthetic | T1 |
| FR-03 | Score accounts with a registered model and write alerts with an SLA due date (7 working days, weekends skipped) | T1 |
| FR-04 | Mine evidence for cycle, fan-out and fan-in patterns and snapshot rows per case | T1 |
| FR-05 | Draft claims as JSON conforming to the claim schema, via Snowflake Cortex | T1 |
| FR-06 | Verify every non-judgement claim using SQL against the case snapshot | T1 |
| FR-07 | Block any draft containing a contradicted or unsupported claim | T1 |
| FR-08 | Repair loop: feed actual values back to the LLM, max 2 rounds, then escalate to human | T1 |
| FR-09 | Recall check: flag omitted vital facts for the detected pattern | T1 |
| FR-10 | Seal approved drafts with a SHA-256 over canonical content and chain it to the previous seal | T1 |
| FR-11 | Replay a filing: reload stored claims and snapshot, re-verify, recompute hash, compare | T1 |
| FR-12 | Planted-error harness with catch rate and false-block rate | T1 |
| FR-13 | Label opinion as JUDGEMENT, shown as analyst judgement, never counted as verified | T1 |
| FR-14 | Maker-checker: author cannot approve own draft | T2 |
| FR-15 | Natural-language questions via Cortex Agent over a Semantic View | T2 |
| FR-16 | Regulatory text search with enforced citations and abstention | T2 |
| FR-17 | Masking policy on KYC columns for the auditor role | T2 |
| FR-18 | Tipping-off guard: no customer-facing text generation, visible notice in UI | T2 |
| FR-19 | Inject-error demo control (demo mode only) | T2 |
| FR-20 | CLI and SDK wrapping the core verifier | T3 |

## 8. Non-functional requirements

- **Determinism.** Same snapshot plus same claims gives the same verdicts and hash. Timestamps are excluded from the hash.
- **Safety.** Synthetic data only. Least-privilege Snowflake roles. No credentials in prompts, code or logs.
- **Performance.** Verify a case of up to 30 claims in under 10 seconds on an X-Small warehouse (target, to be validated).
- **Cost control.** Resource monitor on the warehouse. Model calls are limited per case.
- **Accessibility.** WCAG AA contrast, visible keyboard focus, reduced-motion respected, no meaning carried by colour alone.
- **Auditability.** Every state change writes an event row.

## 9. Success metrics (the scoreboard)

Targets are goals to validate, not results.

| Metric | Definition | Target |
|---|---|---|
| Claim precision | Verified claims / checkable claims, before and after the verifier | Verifier raises it; report both |
| Claim recall | Vital facts present / vital facts required per pattern | Report both |
| Planted-error catch rate | Corrupted claims flagged / corrupted claims | ≥ 95% |
| False-block rate | Clean claims wrongly blocked | ≤ 2% |
| Typology match | Narrative names the true AMLworld pattern | Report |
| Replay hash match | Identical seals over 100 replays | 100% |
| Detector | PR-AUC, minority F1, recall at fixed alert budget | Report |

## 10. Regulatory context and guardrails

Based on public material; verify the current format and portal before relying on it.

- STR is filed with FIU-IND. Public sources describe a three-part format (KYC profile, transaction details, ground of suspicion) and a 7-working-day filing window. Sources differ on the portal name and the format may have changed.
- PMLA Rules define a suspicious transaction through limbs such as unusual or unjustified complexity or no apparent economic rationale. Cairnquill maps pattern types to these limbs through a small, curated, illustrative table. It is not legal advice.
- Tipping off is prohibited. The product never drafts customer-facing text.

## 11. Data and assumptions

- IBM AMLworld **HI-Small** (`HI-Small_Trans.csv`, `HI-Small_Patterns.txt`). Synthetic, with ground-truth laundering labels and pattern files.
- Synthetic KYC overlay (occupation, declared income, branch), generated by us and labelled synthetic everywhere.
- Fixed, illustrative FX table for any cross-currency check, labelled as an assumption.
- Metrics will not transfer to a real bank without retesting.

## 12. Snowflake and CoCo CLI summary

Details are in `TECH_STACK.md` and `BACKEND_SCHEMA.md`.

| Snowflake capability | Use in Cairnquill |
|---|---|
| Tables, stages, `COPY INTO` | Load data, hold snapshots and audit records |
| Dynamic Tables | Incremental feature computation |
| Snowflake ML, Model Registry | Train and version the detector |
| Cortex `AI_COMPLETE` | Quill claim drafting |
| Semantic Views and Cortex Analyst | Governed risk metrics for questions |
| Cortex Agent | Natural-language helper (outside the filing path) |
| Cortex Search | Regulatory text with citations |
| Masking policies, roles | Governance, auditor view |
| Resource monitor | Cost control |
| Snowpark Container Services | Optional deployment (T3) |

**CoCo CLI** is used to scaffold and build the Snowflake objects: schema, features, model training and registration, Semantic View, Cortex Agent and agent evaluation. Keep a `COCO_LOG.md` of prompts and outputs as submission evidence.

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Time | Ship T1 first; cut T3 |
| LLM returns invalid JSON | Validate against schema, retry once, then fail with a clear error |
| Verifier trusts wrong claim types | Few, strict claim types; qualitative text is JUDGEMENT |
| Cycle query explodes | Time-window bounds, anchored on one account, row limits |
| Currency mistakes | Sums always name a currency; never add across currencies |
| Agent with live Snowflake session is manipulated | Least-privilege role, terminal approvals, no secrets in prompts |
| Synthetic data overclaim | State the limitation on every results page |

## 14. Hackathon alignment

| Rubric | How Cairnquill scores |
|---|---|
| Technical execution (40%) | Verifier, evaluation harness, Snowflake-native stack, CoCo CLI build |
| Real-world relevance (30%) | India STR workflow, maker-checker, tipping-off guard, audit replay |
| Solution completeness (30%) | Alert to sealed report, plus scoreboard and UI |

## 15. Open questions

- Is submission still open, and what artefacts does it require (video, repo link)?
- Which Cortex models are available in your region and account?
- Are other AI coding tools permitted by the Terms and Conditions?
- Will you build Multi-GNN, or stay with XGBoost only?
