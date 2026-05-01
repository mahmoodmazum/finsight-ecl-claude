# FinSight ECL — End User Guide

**IFIC Bank Bangladesh | IFRS 9 Expected Credit Loss Platform**
*Version 1.0 — March 2025*

---

## Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [User Roles and What You Can Do](#3-user-roles-and-what-you-can-do)
4. [Module Guide](#4-module-guide)
   - Dashboard
   - Data Ingestion
   - Risk Segmentation
   - Stage Classification
   - SICR Assessment
   - ECL Calculation
   - Macro Scenarios
   - Provision & GL
   - Management Overlays
   - Reports
   - Model Governance
   - Audit Trail
   - User Management
   - Role Management
5. [Month-End Workflow](#5-month-end-workflow)
6. [Common Tasks — Quick Reference](#6-common-tasks--quick-reference)
7. [Understanding ECL Numbers](#7-understanding-ecl-numbers)
8. [Troubleshooting](#8-troubleshooting)
9. [Glossary](#9-glossary)

---

## 1. Introduction

### What is FinSight ECL?

FinSight ECL is IFIC Bank's system for calculating and managing the **Expected Credit Loss (ECL)** provision required under **IFRS 9 Financial Instruments**. Every month, the bank must estimate how much money it might lose on its loan portfolio and set aside a financial cushion (the "provision") to cover those potential losses. FinSight ECL does this calculation automatically, tracks all the steps, and produces the reports required by both the bank's own management and Bangladesh Bank (the central bank regulator).

Before FinSight ECL, this calculation was done in spreadsheets — a slow, error-prone process that was difficult to audit. FinSight ECL replaces those spreadsheets with a controlled, traceable system where every number can be traced back to its source, every decision is logged, and every approver's sign-off is recorded.

### What is IFRS 9 ECL in Plain Language?

IFRS 9 is an international accounting rule that says banks must be honest about the expected future losses in their loan books — not just the losses that have already happened. Think of it this way: if a customer starts missing payments, a bank should not wait until they actually default to recognise that something has gone wrong. IFRS 9 says the bank should start setting aside money as soon as there are early warning signs.

To do this, the standard divides every loan into one of three stages. Stage 1 loans are healthy — the bank sets aside a small cushion based on 12 months of expected losses. Stage 2 loans have shown significant warning signs (like rising days past due or deteriorating credit ratings) — the bank must set aside a larger cushion covering the full remaining life of the loan. Stage 3 loans are already in default — the full expected loss must be provided for immediately.

The ECL number itself is calculated using three inputs: the **Probability of Default** (how likely is the borrower to stop paying?), the **Loss Given Default** (if they do default, what fraction of the loan will we lose after recovering collateral?), and the **Exposure at Default** (how much money will be owed at the moment of default?). FinSight ECL applies these three inputs for every loan in the portfolio, adjusts for current and forecast economic conditions, and produces the total provision number.

### How This System Helps IFIC Bank Comply with Bangladesh Bank

Bangladesh Bank requires all scheduled banks to comply with IFRS 9 and to produce quarterly regulatory returns showing their provision positions. FinSight ECL produces both the IFRS 9 ECL figure and a parallel Bangladesh Bank CL-based provision figure, allowing the Risk team to compare the two and ensure compliance. The system also maintains a complete, immutable audit trail — every calculation, every approval, every override is permanently recorded — which is essential for regulatory inspections and external audits.

---

## 2. Getting Started

### How to Log In

1. Open your web browser and go to the FinSight ECL application URL provided by IT.
2. You will see a login page with two fields: **Email** and **Password**.
3. Enter the email address and password assigned to you by the System Administrator.
4. Click **Sign In**.
5. You will be taken to the Dashboard.

> **First-time users:** If this is your first login, use the temporary password provided by the System Administrator and change it immediately using the profile settings.

### How to Log Out

Click your name or the user icon in the top-right corner of the screen and select **Log Out**. For security, always log out when you leave your workstation.

### What to Do If You Forget Your Password

Contact the System Administrator (admin@finsight.com) to have your password reset. For security reasons, there is no self-service password reset — a verified administrator must reset it for you.

### Overview of the Screen Layout

When you log in, you will see three main areas:

| Area | Description |
|------|-------------|
| **Sidebar (left)** | Navigation menu listing all modules. Click any item to go to that page. |
| **Top Bar** | Shows the application name on the left and your username on the right. |
| **Main Area** | The content of the selected module — tables, charts, forms, etc. |

### How the Sidebar Works

- The sidebar lists all 14 modules in a logical order, from data input at the top to reports and governance at the bottom.
- You will only see the modules that your role has permission to access. A Viewer, for example, will not see the User Management module.
- On smaller screens, the sidebar can be collapsed by clicking the menu icon (three horizontal lines) at the top left.

---

## 3. User Roles and What You Can Do

FinSight ECL uses a role-based access system. Your role controls which pages you can see and which actions you can take. The four standard roles are:

| Role | Who Has It | Description |
|------|-----------|-------------|
| **SUPER_ADMIN** | IT Administrator | Full access to everything, including user management, role configuration, and all operational modules. |
| **CRO** | Chief Risk Officer | Full operational access. The only role that can approve provision runs, approve macro scenarios, and approve stage overrides. |
| **ANALYST** | ECL Analysts, Risk Officers | Can run calculations, submit overrides, manage data, and generate reports. Cannot approve. |
| **VIEWER** | Finance Team, Senior Management, Auditors | Read-only access to all results, reports, and dashboards. Cannot run calculations or make changes. |

### What Each Role Can Do — Module by Module

| Module | SUPER_ADMIN | CRO | ANALYST | VIEWER |
|--------|:-----------:|:---:|:-------:|:------:|
| Dashboard | ✅ View | ✅ View | ✅ View | ✅ View |
| Data Ingestion | ✅ All | ✅ View | ✅ All | ❌ |
| Risk Segmentation | ✅ All | ✅ Edit | ✅ View | ✅ View |
| Stage Classification | ✅ All | ✅ Approve | ✅ Run + Submit | ✅ View |
| SICR Assessment | ✅ All | ✅ Edit Rules | ✅ View | ✅ View |
| ECL Calculation | ✅ All | ✅ Run + Edit | ✅ Run + Edit | ✅ View |
| Macro Scenarios | ✅ All | ✅ Approve | ✅ Edit | ✅ View |
| Provision & GL | ✅ All | ✅ Approve + Lock | ✅ View | ✅ View |
| Management Overlays | ✅ All | ✅ Approve + Expire | ✅ Submit | ✅ View |
| Reports | ✅ All | ✅ All | ✅ All | ✅ View only |
| Model Governance | ✅ All | ✅ Edit + Register | ✅ View | ✅ View |
| Audit Trail | ✅ All | ✅ View | ✅ View | ✅ View |
| User Management | ✅ All | ❌ | ❌ | ❌ |
| Role Management | ✅ All | ❌ | ❌ | ❌ |

---

## 4. Module Guide

---

### Dashboard

**What this page is for:** The Dashboard gives you a snapshot of the bank's current ECL position at a glance. It shows the total ECL provision, how it is split across Stage 1, Stage 2, and Stage 3, which segments are driving the most provision, and what the current macro scenario weights are. It also shows the most recent provision runs.

**Who uses it and when:** Everyone uses the Dashboard. Analysts check it at the start of each working day and after running calculations. The CRO reviews it before approving provision runs. Senior management and Viewers use it for an overview.

**Key numbers on this page:**

| Field | What It Means |
|-------|---------------|
| **Total ECL** | The total expected credit loss provision for the latest reporting month, in BDT Crore. |
| **Stage 1 / 2 / 3 ECL** | How the total ECL is split by stage. Stage 3 usually carries a disproportionately large share. |
| **ECL by Segment** | A bar chart showing which loan segments (Corporate, SME, Retail, etc.) contribute the most to the total ECL. |
| **Scenario Weights** | The current weighting between Base, Optimistic, and Pessimistic macro scenarios. |
| **Recent Runs** | A table of the latest provision runs with their status (DRAFT, APPROVED, LOCKED). |

---

### Data Ingestion

**What this page is for:** Before any ECL calculation can happen, loan data must be loaded into the system from the bank's core banking system (Temenos T24), the collateral management system, and other sources. This page shows the status of all data sources, when they last ran, and whether there were any errors.

**Who uses it and when:** Analysts use this page at the start of each month to verify that all data has loaded correctly before running the staging engine or ECL calculation.

**Main actions:**

**To check data source status:**
1. Go to **Data Ingestion**.
2. The table shows each data source, its last run time, how many records were loaded, and whether it succeeded.
3. A green status means the last run was successful. Red means there was a failure — investigate using the **Load History** tab.

**To trigger a manual data load:**
1. Find the data source you want to reload.
2. Click the **Trigger** button (visible only to Analysts and above).
3. The status will change to RUNNING. Refresh after a few minutes to see the result.

**To upload Bangladesh Bank macro data (CSV):**
1. Click the **Upload Macro CSV** button.
2. Select the CSV file provided by Bangladesh Bank (or the Economics team).
3. Click **Upload**. The system will validate the file and load the macro indicators.

**To investigate data quality issues:**
1. Click the **Quality Issues** tab.
2. You will see a list of records that failed validation — for example, a loan with a DPD value that contradicts its classification status.
3. Review each issue. If it is a genuine data error, contact the CBS team to correct it and re-run the load. If it is acceptable, click **Resolve**.

---

### Risk Segmentation

**What this page is for:** FinSight ECL groups loans into segments before calculating ECL. Each segment has its own PD model, LGD parameters, and CCF. This page shows how the segments are defined and what parameters apply to each.

**Who uses it and when:** The CRO and senior analysts review this page quarterly when reviewing model parameters. Changes to segment definitions require CRO approval.

**Tabs on this page:**

- **Segments:** Shows the full list of segments with their assessment method, LGD floor, and CCF.
- **PD Parameters:** Shows the historical probability of default observations used to calculate the weighted PD for each segment.
- **LGD Rules:** Shows the loss given default values by security tier (over-secured, partially secured, unsecured) for each segment.

**Common questions:**

*Q: Why does the LGD for the Retail segment look higher than Corporate?*
A: Retail loans typically have no collateral, so the unsecured LGD floor is higher. Corporate loans usually have property or other collateral which reduces LGD.

*Q: What is CCF?*
A: Credit Conversion Factor. For revolving facilities (like overdrafts), the bank may not have drawn the full limit yet. CCF estimates what fraction of the undrawn limit will be drawn before default. A CCF of 100% means the full committed facility is included in EAD.

---

### Stage Classification

**What this page is for:** This page shows which stage (1, 2, or 3) every loan in the portfolio has been assigned for the selected reporting month, and why. It also allows Analysts to submit manual overrides when the automatic classification does not reflect reality, and allows the CRO to approve those overrides.

**Who uses it and when:** Analysts review this after running the staging engine to check for obvious misclassifications. The CRO approves override requests. This is typically Day 2 of the month-end process.

**Main actions:**

**To run the staging engine:**
1. Select the reporting month (e.g., 202503).
2. Click **Run Staging Engine**.
3. The engine will re-classify all loans. When complete, the table refreshes.

**To review stage results:**
1. Use the **Stage** filter buttons (All / Stage 1 / Stage 2 / Stage 3) to focus on specific segments.
2. Tick **Overrides Only** to see loans that have been manually reclassified.
3. The table shows loan ID, customer name, stage, DPD, CL status, SICR flag, and whether there is an override.

**To submit a stage override (Analyst):**
1. Find the loan you want to override.
2. Click **Submit Override** in the actions column.
3. In the form that appears:
   - Select the correct stage from the dropdown.
   - Enter a clear reason (e.g., "Loan has been fully restructured under court order — DPD should not trigger Stage 3").
4. Click **Submit**. The override will show as PENDING until the CRO approves it.

**To approve a stage override (CRO):**
1. Filter the table to **Overrides Only**.
2. Find overrides in PENDING status.
3. Review the reason. If acceptable, click **Approve**. If not, discuss with the analyst and ask them to revise.

---

### SICR Assessment

**What this page is for:** SICR stands for Significant Increase in Credit Risk — the event that triggers a loan moving from Stage 1 to Stage 2. This page shows which loans have triggered SICR and why, and displays the configurable rules that define the SICR thresholds.

**Who uses it and when:** Analysts review this page to understand which loans are at risk of stage migration. The CRO reviews it before approving provision runs to confirm the SICR triggers are appropriate.

**Tabs on this page:**

- **Assessment:** A table of all loans, showing whether each one triggered SICR, which factors triggered it (DPD threshold, CL status, CRR deterioration, watchlist), and its current stage.
- **Factor Summary:** An aggregate view showing how many loans triggered each SICR factor across the portfolio.
- **Rules Config:** The configurable thresholds (DPD for Stage 2, DPD for Stage 3, CRR threshold, etc.).

**To change SICR thresholds (CRO only):**
1. Go to the **Rules Config** tab.
2. You will see fields for DPD Stage 2 threshold, DPD Stage 3 threshold, CRR threshold, and toggle switches for watchlist and forbearance triggers.
3. Edit the values and click **Save Rules**.
4. Re-run the staging engine (on the Stage Classification page) for the new rules to take effect.

> **Important:** Changing SICR rules affects the entire portfolio's stage classification. Always discuss changes with the model team and document the reason in the Risk Register before applying.

---

### ECL Calculation

**What this page is for:** This is where the actual ECL numbers are produced. The analyst triggers an ECL run, which calculates the Expected Credit Loss for every loan in the portfolio using PD, LGD, EAD, and macro scenario weightings. Results are stored and can be reviewed at the loan level, portfolio level, or by segment.

**Who uses it and when:** Analysts run ECL calculations on Day 2 or 3 of the month-end process, after staging has been completed and macro scenarios have been approved.

**Main actions:**

**To run an ECL calculation:**
1. Select the reporting month.
2. Choose the **Run Type**: MONTH_END (for official runs), INTRAMONTH (for interim checks), or TEST (for testing parameter changes).
3. Click **Run ECL Calculation**.
4. A banner will appear showing the run status (QUEUED → RUNNING → DRAFT). The page polls automatically and refreshes when complete.

**To review ECL results:**
1. Once the run is DRAFT or higher, go to the **Results** tab.
2. The table shows each loan's EAD, PD, LGD, EIR, and ECL under each scenario (Base, Optimistic, Pessimistic) and the weighted ECL.
3. Use the Stage filter to focus on Stage 2 or Stage 3 loans, which typically need the most scrutiny.

**To review the portfolio summary:**
1. Click the **Portfolio Summary** tab.
2. You will see totals by segment: number of loans, total EAD, average PD, average LGD, and ECL by stage.
3. The bar chart shows ECL by segment — useful for identifying which segments are driving the provision.

**To review LGD parameters:**
1. Click the **LGD Parameters** tab.
2. This shows the LGD values currently in effect for the month, broken down by segment and security tier.
3. Analysts with the right permission can edit these values directly and re-run the ECL calculation.

---

### Macro Scenarios

**What this page is for:** ECL must reflect not just current conditions but also possible future economic environments. FinSight ECL uses three macro scenarios — Base, Optimistic, and Pessimistic — each with a set of macroeconomic variables (GDP growth, inflation, exchange rate, etc.) and an associated probability weight. The weighted ECL combines all three scenarios into a single provision figure.

**Who uses it and when:** Analysts prepare the scenario data each month using Bangladesh Bank macro indicators. The CRO approves the scenarios before the ECL run.

**Main actions:**

**To review current scenarios:**
1. Go to **Macro Scenarios**.
2. Select the reporting month from the filter.
3. The three scenarios (BASE, OPTIMISTIC, PESSIMISTIC) are shown with their variable values, weights, and current status.

**To add or update a scenario:**
1. Click **Add Scenario** (or click the edit icon on an existing scenario).
2. Enter the macro variable values. These come from the Bangladesh Bank Economic Trends report or the bank's Economics team.
3. Enter the **Macro Multiplier** — this is the factor by which the base ECL will be scaled for this scenario (a value above 1.0 means the scenario is worse than base).
4. Enter the **Weight** (must total 1.00 across all three scenarios for a given month).
5. Click **Save**.

**To approve scenarios (CRO):**
1. Review the three scenarios — check that the variables are reasonable and the weights reflect the bank's current view.
2. Click **Approve** on each scenario.
3. Only approved scenarios are used in the ECL calculation.

**To review macro sensitivity analysis:**
1. Click the **Sensitivity** tab.
2. This shows how much each scenario contributes to the final weighted ECL, and the overall weighted multiplier.

---

### Provision & GL

**What this page is for:** Once an ECL run is completed and reviewed, the Analyst submits it for CRO approval. Once approved, the CRO can lock it. This page also shows the ECL movement waterfall (what changed versus last month) and the auto-generated general ledger journal entries.

**Who uses it and when:** Analysts use this to submit runs for approval. The CRO uses it to review, approve, and lock provision runs. The Finance team uses it to see the GL entries before posting to FLEXCUBE.

**Tabs on this page:**

- **Runs:** List of all provision runs, their status, and action buttons.
- **Movement Waterfall:** Shows the bridge from last month's ECL to this month's ECL, broken down by movement type.
- **GL Entries:** The auto-generated debit/credit journal entries for the provision movement.

**To submit a provision run for approval (Analyst):**
1. Go to the **Runs** tab.
2. Find the DRAFT run for the current month.
3. Click **Submit for Approval**. The status changes to PENDING_APPROVAL.

**To approve a provision run (CRO):**
1. Find the run in PENDING_APPROVAL status.
2. Review the ECL total and the movement waterfall — does the change make sense? Is the net movement explained by the waterfall components?
3. If satisfied, click **Approve**. The status changes to APPROVED.

**To lock a provision run (CRO):**
1. Find the APPROVED run.
2. Click **Lock**. This is irreversible — a locked run cannot be changed.
3. Locking triggers the final GL entries and makes the run available for reporting.

> **Important:** Lock only after the Finance team has confirmed the GL entries are correct and the reporting period is officially closed.

**To review the waterfall:**
1. Click the **Movement Waterfall** tab.
2. Select the provision run from the dropdown.
3. The chart and table show each movement type (new originations, stage migrations, cures, parameter changes, macro updates, repayments, write-offs) and their individual impact on the ECL.

---

### Management Overlays

**What this page is for:** Sometimes the model result needs a manual adjustment — for example, because of an event the model cannot capture (a natural disaster, a court ruling, a specific sector shock). A Management Overlay is a controlled, auditable adjustment to the ECL or its components, requiring dual-control: submission by an Analyst and approval by the CRO.

**Who uses it and when:** Analysts submit overlays when they identify situations not captured by the model. The CRO approves them. Overlays should be used sparingly and must always have a documented rationale.

**Main actions:**

**To submit an overlay (Analyst):**
1. Click **+ New Overlay**.
2. In the form:
   - Choose whether the overlay applies to a specific loan or an entire segment.
   - Choose the overlay type (e.g., PD_CAP_FLOOR, LGD_HAIRCUT, SECTOR, STAGE).
   - Enter the adjustment factor (e.g., 1.15 means a 15% upward adjustment).
   - Enter a detailed rationale — this is mandatory and will be reviewed by the CRO and auditors.
   - Set the effective from and to dates.
3. Click **Submit**. The overlay shows as PENDING.

**To approve an overlay (CRO):**
1. Find the overlay in PENDING status.
2. Review the rationale, the affected loans/segment, and the factor.
3. Click **Approve** or **Reject** with a note explaining your decision.

**To expire an overlay:**
1. Find an active (APPROVED) overlay that is no longer needed.
2. Click **Expire**. This sets the effective_to date to the current month and marks it EXPIRED.

**Overlay types explained:**

| Type | What It Does |
|------|-------------|
| PD_CAP_FLOOR | Multiplies the model PD by the adjustment factor (e.g., 1.15 = 15% higher PD) |
| LGD_HAIRCUT | Multiplies the model LGD by the factor (increases expected loss after collateral recovery) |
| SECTOR | Portfolio-level multiplier for a specific economic sector |
| STAGE | Forces a loan to a specific stage regardless of model output |
| CURE_RATE | Adjusts the cure rate assumption for a segment |

---

### Reports

**What this page is for:** FinSight ECL can generate six types of reports, covering IFRS 9 disclosures, Bangladesh Bank regulatory requirements, and internal management information. Reports can be generated for any month and downloaded as Excel files.

**Who uses it and when:** Analysts generate reports throughout the month-end process. The Finance team uses GL Summary reports. The CRO and CFO use ECL Summary and BB Regulatory reports. External auditors use IFRS 7 disclosures.

**Tabs on this page:**

- **Report Library:** All available reports with a Generate and Download button.
- **BB Regulatory:** An on-screen view of the Bangladesh Bank provision schedule.
- **IFRS 7 Disclosure:** An on-screen view of the IFRS 7 credit risk tables.

**To generate and download a report:**
1. Ensure the reporting month is set correctly using the month picker at the top right.
2. Go to the **Report Library** tab.
3. Find the report you want.
4. Click **Generate (YYYYMM)** — this confirms the report is ready and logs the event.
5. Click **↓ Excel** to download the file as an Excel spreadsheet.

**Available reports:**

| Report | What It Contains | Who Uses It |
|--------|-----------------|-------------|
| ECL Portfolio Summary | Stage-wise ECL by segment with PD, LGD, and EAD breakdown | CRO, Analysts |
| Staging Classification Summary | Stage distribution, SICR counts, override summary | Risk team |
| Macro Scenario Sensitivity | How ECL changes under each scenario | CRO, Board |
| BB Regulatory Provision | BB CL-classification provision schedule with coverage ratios | Finance, Compliance |
| IFRS 7 Financial Instruments Disclosure | Credit risk tables for the Annual Report | CFO, Auditors |
| GL Entry Summary | Journal entries with movement waterfall | Finance team |

---

### Model Governance

**What this page is for:** FinSight ECL uses statistical models (for PD, LGD, and macro factors) that must be formally registered, validated, and approved before use in production. This page is the model registry — it tracks every model's version, performance statistics, and approval status.

**Who uses it and when:** The Model Risk team uses this to manage the model lifecycle. The CRO reviews and approves models before they go into production. Analysts and Viewers can see model performance statistics.

**Tabs on this page:**

- **Model Registry:** All registered models with their type, version, status, and Gini/KS statistics.
- **Backtesting:** Performance statistics for models currently in Validation or Production.
- **Roadmap:** All models and their current status in the implementation pipeline.

**To register a new model:**
1. Click **+ Register Model**.
2. Enter: Model ID (unique), Model Name, Type (PD/LGD/EAD/MACRO), Version, and Method (e.g., Logistic Regression).
3. Optionally enter Gini Coefficient and KS Statistic if available from the validation report.
4. Click **Register Model**. The model starts in DEVELOPMENT status.

**To approve a model for production:**
1. Find the model in VALIDATION status.
2. Click **Approve**. The model moves to PRODUCTION.
3. Only models in PRODUCTION are used in the live ECL calculation.

**Performance metrics explained:**

| Metric | Good Range | What It Means |
|--------|-----------|---------------|
| Gini Coefficient | > 0.40 | Measures how well the model separates defaults from non-defaults. Higher is better. A Gini of 0.68 means the model is substantially better than random. |
| KS Statistic | > 0.30 | Maximum separation between default and non-default cumulative distributions. Higher is better. |

---

### Audit Trail

**What this page is for:** Every action in FinSight ECL is recorded in an immutable audit log — who did what, when, and to which record. This page lets you search and review those records. It also contains the Implementation Risk Register, which tracks known risks related to the IFRS 9 model and data.

**Who uses it and when:** Analysts and the CRO use this to investigate questions about past calculations or decisions. External auditors and Bangladesh Bank inspectors will review this log. The Risk Register is maintained by the Risk team.

**Tabs on this page:**

- **Audit Log:** Searchable log of all system events. Filter by event type (e.g., ECL_RUN_COMPLETE) or entity type (e.g., provision_run).
- **Risk Register:** List of identified risks with their rating, status, owner, and mitigation.

**To search the audit log:**
1. Go to the **Audit Log** tab.
2. Type in the **Filter by event type** box — for example, type "STAGE_OVERRIDE" to see all override events.
3. Type in **Filter by entity type** to narrow further — for example, "provision_run" to see only provision-related events.
4. Use the pagination buttons to navigate through results.

**To add a risk item (Analyst/CRO):**
1. Go to the **Risk Register** tab.
2. Click **+ Add Risk**.
3. Enter the risk title, category, rating (HIGH/MEDIUM/LOW), description, and mitigation.
4. Click **Save**.

---

### User Management

**What this page is for:** System Administrators can create, view, edit, and deactivate user accounts here. Each user must have an email address, full name, and at least one role.

**Who uses it and when:** Only SUPER_ADMIN users can access this page. It is used when a new staff member joins the bank and needs access, or when someone leaves and their account must be deactivated.

**To create a new user:**
1. Go to **User Management**.
2. Click **+ Add User**.
3. Enter the user's full name, email address, and a temporary password.
4. Click **Create User**.
5. Then assign a role — see "To assign a role to a user" below.
6. Inform the user of their temporary password and ask them to change it on first login.

**To assign a role to a user:**
1. Find the user in the list.
2. Click **Manage Roles** (or **Roles**) in the actions column.
3. Select the role to assign and optionally set an expiry date.
4. Click **Assign**.

**To deactivate a user:**
1. Find the user.
2. Click **Deactivate**. The user will no longer be able to log in but their audit history is preserved.

---

### Role Management

**What this page is for:** System Administrators can create custom roles with tailored permission sets. This is useful when a specific job function needs access to some but not all of what a standard role provides.

**Who uses it and when:** SUPER_ADMIN users use this to create custom roles when a standard role (CRO/ANALYST/VIEWER) does not fit a specific job function.

**To create a custom role:**
1. Go to **Role Management**.
2. Click **+ Create Role**.
3. Enter a name (e.g., "COMPLIANCE_OFFICER") and a description.
4. Click **Create**.
5. Click **Manage Permissions** on the new role.
6. Tick the specific permissions needed.
7. Click **Save Permissions**.

> **Note:** The four system roles (SUPER_ADMIN, CRO, ANALYST, VIEWER) cannot be deleted or modified. Only custom roles can be changed.

---

## 5. Month-End Workflow

This section describes everything that happens each month end, in the correct order, step by step. Follow this checklist every month. If any step fails, do not proceed to the next step — investigate and resolve the issue first.

---

### Day 0 — Last Day of the Reporting Month

**Who:** Analysts (Data team)
**What:** Verify that all data is ready for the upcoming month-end run.

- [ ] Confirm T24 CBS end-of-month batch has completed successfully.
- [ ] Go to **Data Ingestion** → check T24 source shows green status with the correct record count.
- [ ] Confirm collateral management system data is up to date.
- [ ] Confirm internal rating system (CRR) data has been refreshed.
- [ ] Check **Quality Issues** tab — resolve any outstanding critical issues before proceeding.

---

### Day 1 — Data Load and Validation

**Who:** Analysts

- [ ] Trigger the T24 CBS data load manually if the scheduled load did not run (Data Ingestion → Trigger).
- [ ] Trigger the collateral system load.
- [ ] Upload Bangladesh Bank macro CSV if available (Data Ingestion → Upload Macro CSV).
- [ ] Review the **Quality Issues** tab after loads complete. Note any DPD inconsistencies or missing fields.
- [ ] Resolve or escalate critical quality issues.

> **Go / No-Go checkpoint:** Do not proceed to Day 2 unless the T24 loan record count matches the expected portfolio count (verify with the Core Banking team).

---

### Day 2 — Staging and SICR Review

**Who:** Analysts (staging run), CRO (override approval)

- [ ] Go to **Stage Classification**. Select the current reporting month (e.g., 202503).
- [ ] Click **Run Staging Engine**. Wait for completion.
- [ ] Review the stage distribution: compare Stage 2 and Stage 3 counts to the prior month. Flag large movements for investigation.
- [ ] Go to **SICR Assessment** → Factor Summary. Review the SICR trigger breakdown.
- [ ] Investigate any loans that appear to have been mis-staged (e.g., a known good account in Stage 3 due to a DPD data error).
- [ ] For each mis-staged loan, submit a **Stage Override** with a clear rationale.
- [ ] Send override requests to the CRO for approval.
- [ ] CRO reviews and approves (or rejects) each override.
- [ ] Re-run the Staging Engine after all overrides are approved to confirm the final stage counts.

---

### Day 3 — Macro Scenarios

**Who:** Analysts (prepare), CRO (approve)

- [ ] Go to **Macro Scenarios**. Select the current reporting month.
- [ ] Check whether the three scenarios (BASE, OPTIMISTIC, PESSIMISTIC) already exist and reflect the current month's data.
- [ ] If new data is available from Bangladesh Bank or the Economics team, update the macro variable values for each scenario.
- [ ] Review the **Sensitivity** tab to confirm the weighted multiplier looks reasonable.
- [ ] Send the three scenarios to the CRO for approval.
- [ ] CRO approves all three scenarios.

> **Go / No-Go checkpoint:** All three macro scenarios must be in APPROVED status before the ECL run can proceed.

---

### Day 4 — ECL Calculation

**Who:** Analysts (run), CRO (review)

- [ ] Go to **ECL Calculation**. Select the current reporting month.
- [ ] Select Run Type: **MONTH_END**.
- [ ] Click **Run ECL Calculation**.
- [ ] Wait for the run status to change from RUNNING to DRAFT. This may take a few minutes.
- [ ] Review the **Portfolio Summary** tab: check total ECL and the stage breakdown.
- [ ] Compare the total ECL to the prior month. Is the movement (increase or decrease) broadly consistent with what you observed in the staging step?
- [ ] Review the **Results** tab for Stage 3 loans — spot-check that the ECL for defaulted accounts looks reasonable.
- [ ] If results look correct, proceed. If something looks wrong, investigate before continuing.

> **Optional:** If parameter changes were made (e.g., new LGD values), run a TEST run first to see the impact before committing to the MONTH_END run.

---

### Day 5 — Management Overlays

**Who:** Analysts (submit), CRO (approve)

- [ ] Go to **Management Overlays**. Review active overlays — are any approaching their effective_to date?
- [ ] If there are any new sector events or management judgements that the model has not captured, submit a new overlay with a clear rationale.
- [ ] CRO reviews and approves or rejects all PENDING overlays.
- [ ] If any overlays affect the ECL (e.g., a PD or LGD overlay on a large segment), re-run the ECL calculation with Run Type MONTH_END to incorporate the overlay.

---

### Day 6 — Provision Submission and Approval

**Who:** Analysts (submit), CRO (approve)

- [ ] Go to **Provision & GL** → **Runs** tab.
- [ ] Find the DRAFT run for the current month.
- [ ] Click **Submit for Approval**.
- [ ] CRO goes to **Provision & GL** → **Runs**.
- [ ] CRO reviews the total ECL, the movement waterfall (**Movement Waterfall** tab), and the GL entries (**GL Entries** tab).
- [ ] CRO compares IFRS 9 ECL to the BB regulatory minimum (check via **Reports** → **BB Regulatory**). Escalate to CFO and Compliance if IFRS 9 ECL is below the BB minimum.
- [ ] If satisfied, CRO clicks **Approve**. Run status becomes APPROVED.

---

### Day 7 — Reports and Sign-Off

**Who:** Analysts (generate), CRO (sign off), Finance team (GL posting)

- [ ] Go to **Reports**. Set the month picker to the current reporting month.
- [ ] Generate and download all required reports:
  - [ ] ECL Portfolio Summary (for CRO/Board pack)
  - [ ] BB Regulatory Provision (for Bangladesh Bank submission)
  - [ ] IFRS 7 Disclosure (for Annual Report / quarterly disclosure)
  - [ ] GL Entry Summary (for Finance team)
- [ ] Finance team reviews GL entries in FinSight and matches to FLEXCUBE journal.
- [ ] Once GL is confirmed, CRO returns to **Provision & GL** and clicks **Lock** on the APPROVED run.
- [ ] The provision run is now immutable. The month-end process is complete.

> **Final check:** Confirm the Audit Log (**Audit Trail** page) shows the PROVISION_RUN_COMPLETE event for the current month. This is the evidence of a completed, controlled month-end process.

---

## 6. Common Tasks — Quick Reference

### How to Run an ECL Calculation

1. Go to **ECL Calculation**.
2. Select the reporting month.
3. Select Run Type (MONTH_END for official run, TEST for trials).
4. Click **Run ECL Calculation**.
5. Wait for status to show DRAFT. Results appear automatically.

### How to Approve a Provision Run

1. Go to **Provision & GL** → **Runs** tab.
2. Find the run in PENDING_APPROVAL status.
3. Review the ECL total and waterfall.
4. Click **Approve** (CRO only).

### How to Submit a Stage Override

1. Go to **Stage Classification**.
2. Find the loan you want to override.
3. Click **Submit Override**.
4. Choose the correct stage and enter a clear reason.
5. Click **Submit**. Awaits CRO approval.

### How to Create a New User

1. Go to **User Management** (SUPER_ADMIN only).
2. Click **+ Add User**.
3. Enter full name, email, and temporary password.
4. Click **Create User**.
5. Click **Manage Roles** on the new user and assign an appropriate role.

### How to Create a Custom Role

1. Go to **Role Management** (SUPER_ADMIN only).
2. Click **+ Create Role**.
3. Enter name and description.
4. Click **Manage Permissions** and tick the required permissions.
5. Click **Save Permissions**.

### How to Generate and Download a Report

1. Go to **Reports**.
2. Set the month picker to the correct reporting month.
3. Click **Generate (YYYYMM)** on the desired report.
4. Click **↓ Excel** to download.

### How to Add a Management Overlay

1. Go to **Management Overlays**.
2. Click **+ New Overlay**.
3. Choose loan-level or segment-level, overlay type, factor, rationale, and dates.
4. Click **Submit**. Awaits CRO approval.

### How to Check the Audit Trail for a Specific Loan

1. Go to **Audit Trail** → **Audit Log** tab.
2. In the **Filter by entity type** box, type "staging_result" or "loan_account".
3. In the **Filter by event type** box, type the event you are looking for (e.g., "STAGE_OVERRIDE").
4. Scroll through the results to find entries for the loan in question (the Entity ID column will show the loan or staging ID).

---

## 7. Understanding ECL Numbers

### What Stage 1 / Stage 2 / Stage 3 Means for the Bank

**Stage 1 — Performing loans:** The borrower is paying on time, the credit quality has not significantly deteriorated since the loan was made, and the bank only needs to hold a 12-month provision. Most loans are in Stage 1. A Stage 1 provision is relatively small — typically 0.1% to 1% of the loan value.

**Stage 2 — Significant Increase in Credit Risk (SICR):** Something has changed — the borrower is between 30 and 89 days past due, or their credit rating has deteriorated significantly, or they have been placed on the watchlist. The bank must now hold a lifetime provision — covering the full expected loss over the remaining life of the loan, not just the next 12 months. Stage 2 provisions can be 5 to 20 times higher than Stage 1 for the same loan.

**Stage 3 — Credit-Impaired (Default):** The borrower is 90+ days past due, or has been classified Bad & Loss (BL) or Doubtful (DF) under Bangladesh Bank's classification, or has formally defaulted. The probability of default is set to 100% — the bank must provide for the full expected loss net of any recoverable collateral. Stage 3 provisions are typically 20% to 60%+ of the loan value depending on collateral.

### What ECL Coverage Ratio Means

ECL Coverage Ratio = (Total ECL Provision ÷ Total Exposure) × 100%

A coverage ratio of 3.2% means that for every BDT 100 of loans outstanding, the bank has set aside BDT 3.20 as provision. A higher ratio indicates a more conservative (prudent) provisioning stance. Bangladesh Bank's minimum BRPD-based coverage requirement varies by loan classification — the BB Regulatory report in FinSight shows where the bank stands against those minimums.

### What the Waterfall Chart Shows

The movement waterfall (in Provision & GL) shows the bridge from last month's ECL provision to this month's. Each bar represents a cause of change:

| Movement Type | Positive (Increase) | Negative (Decrease) |
|--------------|---------------------|---------------------|
| New Origination | New loans added to portfolio | — |
| Stage 1→2 | Loans migrated to higher-risk stage | — |
| Stage 2→3 | Loans migrated to default | — |
| Cure 2→1 | — | Loans recovered back to Stage 1 |
| Parameter Change | PD/LGD updated upward | PD/LGD updated downward |
| Macro Update | Macro scenarios worsened | Macro scenarios improved |
| Repayment | — | Loans repaid, reducing EAD |
| Write-Off | — | Fully written-off loans removed |

The starting point + all bars should equal the closing ECL total.

### What Macro Scenario Weights Mean

FinSight ECL does not use a single view of the future. Instead it calculates ECL under three economic scenarios and blends them:

- **Base (50%):** The most likely outcome — moderate growth, stable exchange rate.
- **Optimistic (25%):** A better-than-expected outcome — higher growth, lower NPLs.
- **Pessimistic (25%):** A worse-than-expected outcome — recession risk, currency depreciation.

The Weighted ECL = (50% × Base ECL) + (25% × Optimistic ECL) + (25% × Pessimistic ECL).

If the weights are changed (e.g., shifting more weight to Pessimistic during a crisis), the total provision increases even if the underlying loan quality does not change — this is an intentional and auditable management judgement.

### What Dual Run Comparison Means

Bangladesh Bank requires banks to provision under both the IFRS 9 methodology (ECL) and the older BRPD-based classification method. FinSight ECL runs both calculations and compares them. If the IFRS 9 ECL falls below the BB minimum, the bank must use the higher BB figure for reporting purposes. The Provision & GL module flags any gap between the two.

---

## 8. Troubleshooting

### Page Shows No Data

**Symptom:** A module page loads but shows "No records found" or an empty table.

**Possible causes and solutions:**
1. **Wrong reporting month selected** — Check the month filter at the top of the page. Change it to the correct month (e.g., 202503).
2. **Data not yet loaded** — Go to Data Ingestion and check whether the data load for this month has completed.
3. **ECL run not yet done** — If the ECL Results page is empty, it means no ECL run has been completed for this month. Run the ECL calculation first.
4. **Filtering too narrow** — Check if you have active stage filters or status filters that are hiding results. Click "All" to clear them.

### ECL Run Failed

**Symptom:** The ECL run shows status FAILED.

**Possible causes and solutions:**
1. **Macro scenarios not approved** — Go to Macro Scenarios and ensure all three scenarios for this month are APPROVED. Then re-run.
2. **No loan data loaded** — Go to Data Ingestion and confirm the T24 loan load completed successfully for this month.
3. **No PD/LGD parameters** — Ensure PD and LGD parameters exist for this reporting month in the Risk Segmentation module.
4. **System error** — If none of the above, check with IT/DevOps for backend error logs. The audit log (Audit Trail) will show the FAILED event with details.

### Cannot Approve a Provision Run

**Symptom:** The Approve button is missing or greyed out.

**Possible causes and solutions:**
1. **Wrong role** — Only the CRO role can approve provision runs. Contact the System Administrator if your role should have this permission.
2. **Run not in correct status** — You can only approve a run in PENDING_APPROVAL status. If the run is still in DRAFT, the Analyst must submit it first.
3. **Already locked** — Locked runs cannot be changed. Check if the run is in LOCKED status.

### Report Generation Failed

**Symptom:** Clicking "Generate" or "↓ Excel" returns an error.

**Possible causes and solutions:**
1. **No data for this month** — The report requires ECL results to exist for the selected month. Ensure the ECL run is complete.
2. **Permission** — Downloading reports requires the `reports:export` permission. Contact the System Administrator if you cannot download.
3. **Wrong month selected** — Check the month picker in the top right of the Reports page.

### Cannot Log In

**Symptom:** The login page returns "Invalid credentials" or "Account inactive".

**Possible causes and solutions:**
1. **Wrong email/password** — Check for typos. Passwords are case-sensitive.
2. **Account deactivated** — Contact the System Administrator to reactivate the account.
3. **Password needs reset** — Contact the System Administrator to reset the password.

### A Loan Is in the Wrong Stage

**Symptom:** You notice that a loan appears to be in an incorrect stage (e.g., a performing loan in Stage 3, or a defaulted loan still in Stage 1).

**Possible causes and solutions:**
1. **DPD data error in CBS** — Check the loan's DPD in the staging results table and compare to the actual payment history in T24. If the DPD is wrong, log a Data Quality Issue and contact the CBS team.
2. **CL Status not updated** — Bangladesh Bank's CL classification may not have been updated in T24 yet. Verify with the Loans department.
3. **Existing override** — Go to Stage Classification and filter by "Overrides Only" — there may be a manual override holding the loan in a particular stage.
4. **If the stage is genuinely wrong** — Submit a Stage Override with a clear explanation and ask the CRO to approve it.

---

## 9. Glossary

| Term | Plain-Language Definition |
|------|--------------------------|
| **BB BRPD** | Bangladesh Bank Banking Regulation and Policy Department. Isues circulars (like BRPD 14/2020) that set minimum provision requirements based on CL classification — separate from IFRS 9. |
| **CCF** | Credit Conversion Factor. The estimated percentage of an undrawn credit facility that a borrower will draw before defaulting. A CCF of 50% on a BDT 100 Cr undrawn overdraft means BDT 50 Cr is included in EAD. |
| **Cohort Model** | A method of estimating PD by grouping loans of similar age or origination period and tracking how many defaulted over time. Used for SME and Retail segments. |
| **CRR** | Credit Risk Rating. An internal rating (1-9) assigned to borrowers by the bank's credit team. A higher CRR number means a higher-risk borrower. |
| **Cure** | When a Stage 2 or Stage 3 loan returns to Stage 1 because the borrower has caught up on missed payments and the credit risk concerns have been resolved. |
| **DPD** | Days Past Due. The number of calendar days since the most recent scheduled payment was missed. A DPD of 0 means the account is current. |
| **Dual Run** | Running both the IFRS 9 ECL calculation and the Bangladesh Bank BRPD classification calculation for the same portfolio, to compare the two provision requirements. |
| **EAD** | Exposure at Default. The estimated amount of money the bank will be owed at the moment a borrower defaults. = Outstanding Balance + (Undrawn Limit × CCF). |
| **ECL** | Expected Credit Loss. The probability-weighted estimate of credit losses over a defined time horizon. ECL = PD × LGD × EAD × Discount Factor. |
| **EIR** | Effective Interest Rate. The actual annualised cost of a loan, used to discount future cash flows back to their present value. Also called the original effective interest rate. |
| **IFRS 9** | International Financial Reporting Standard 9. The accounting rule that requires banks to recognise expected future credit losses rather than waiting for losses to actually occur. |
| **IFRS 7** | International Financial Reporting Standard 7. Requires disclosure of information about financial risk exposures in the notes to the financial statements. |
| **LGD** | Loss Given Default. The fraction of the loan the bank expects to lose after recovering collateral, expressed as a percentage of EAD. An LGD of 45% means the bank expects to lose BDT 45 out of every BDT 100 owed if the borrower defaults. |
| **Lifetime ECL** | Expected credit loss measured over the full remaining life of a loan, rather than just the next 12 months. Applied to Stage 2 and Stage 3 loans. |
| **12-Month ECL** | Expected credit loss measured over the next 12 months only. Applied to Stage 1 loans. Much smaller than lifetime ECL for the same loan. |
| **Macro Scenario** | A defined set of economic assumptions (GDP growth, inflation, exchange rate, etc.) representing one possible future economic environment. FinSight uses three: Base, Optimistic, and Pessimistic. |
| **Management Overlay** | A controlled, CRO-approved adjustment to the model's ECL output to reflect judgements or events not captured by the statistical model. |
| **Override** | When an analyst manually changes the stage that the automatic engine assigned to a loan, subject to CRO approval. |
| **PD** | Probability of Default. The likelihood that a borrower will fail to meet their repayment obligations within a given time horizon. Expressed as a percentage (e.g., 2% means a 2 in 100 chance of default over 12 months). |
| **Provision Run** | One complete execution of the ECL calculation for a given reporting month, progressing through statuses: DRAFT → PENDING_APPROVAL → APPROVED → LOCKED. |
| **SICR** | Significant Increase in Credit Risk. The event (deteriorating DPD, falling credit rating, watchlist placement) that triggers a loan's migration from Stage 1 to Stage 2. |
| **Stage 1 / 2 / 3** | The three IFRS 9 credit risk categories. Stage 1 = performing (12M ECL). Stage 2 = SICR detected (Lifetime ECL). Stage 3 = credit-impaired / defaulted (Lifetime ECL at PD=100%). |
| **Transition Matrix** | A table showing the probability of a loan moving from one stage (or rating) to another over a given period. Used to validate the staging model. |
| **Waterfall** | The chart in Provision & GL that shows how the ECL provision changed between two months, broken down by cause (new loans, stage migrations, repayments, etc.). |
| **Write-off** | When a loan is removed from the bank's books because it is considered unrecoverable. The ECL provision for that loan is "used up" to cover the write-off. |
