/**
 * FinSight ECL — End User Guide Builder
 * Generates EndUserGuide.docx using the docx npm package
 * with embedded screenshots and professional formatting.
 */

const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  ImageRun, PageBreak, Table, TableRow, TableCell, WidthType, BorderStyle,
  Header, Footer, SimpleField, convertInchesToTwip,
  UnderlineType, ShadingType, VerticalAlign, TableLayoutType,
  LevelFormat, convertMillimetersToTwip,
} = require('docx');
const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────────
const SCREENSHOTS = path.join(__dirname, '..', 'screenshots');
const OUT = path.join(__dirname, '..', 'EndUserGuide.docx');
const COMPANY = 'Finsight Software and Technologies Ltd.';
const APP = 'FinSight ECL';
const SUBTITLE = 'IFRS 9 Expected Credit Loss Platform';
const TODAY = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

// Brand colours (hex without #)
const BLUE = '136FFF';
const DARK_BLUE = '0D4FCC';
const NAVY = '1E3A5F';
const LIGHT_BLUE = '97E5FF';
const GRAY = '64748B';
const LIGHT_GRAY = 'F1F5F9';
const WHITE = 'FFFFFF';
const BLACK = '1E293B';

// ── Helpers ──────────────────────────────────────────────────────────────────
function img(filename, widthEmu) {
  const p = path.join(SCREENSHOTS, filename);
  if (!fs.existsSync(p)) return null;
  const buf = fs.readFileSync(p);
  // Use fixed aspect: screenshots are 1440x900 (1.6:1)
  const w = widthEmu || 8_800_000; // ~6.1 inches in EMU
  const h = Math.round(w / 1.6);
  return new ImageRun({ data: buf, transformation: { width: Math.round(w / 9525), height: Math.round(h / 9525) }, type: 'png' });
}

function h1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    run: { color: NAVY, bold: true },
  });
}

function h2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    run: { color: DARK_BLUE },
  });
}

function h3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    run: { color: BLUE },
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, color: BLACK, font: 'Calibri', ...opts })],
    spacing: { before: 60, after: 80 },
  });
}

function bold(text) {
  return new TextRun({ text, bold: true, size: 22, color: BLACK, font: 'Calibri' });
}

function note(text) {
  return new Paragraph({
    children: [
      new TextRun({ text: 'NOTE: ', bold: true, size: 20, color: DARK_BLUE, font: 'Calibri' }),
      new TextRun({ text, size: 20, color: GRAY, font: 'Calibri', italics: true }),
    ],
    spacing: { before: 60, after: 80 },
    indent: { left: convertInchesToTwip(0.25) },
  });
}

function tip(text) {
  return new Paragraph({
    children: [
      new TextRun({ text: 'TIP: ', bold: true, size: 20, color: '0D7B3E', font: 'Calibri' }),
      new TextRun({ text, size: 20, color: '0D7B3E', font: 'Calibri' }),
    ],
    spacing: { before: 60, after: 80 },
    indent: { left: convertInchesToTwip(0.25) },
  });
}

function step(num, text) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${num}. `, bold: true, size: 22, color: BLUE, font: 'Calibri' }),
      new TextRun({ text, size: 22, color: BLACK, font: 'Calibri' }),
    ],
    spacing: { before: 60, after: 80 },
    indent: { left: convertInchesToTwip(0.3), hanging: convertInchesToTwip(0.3) },
  });
}

function bullet(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, color: BLACK, font: 'Calibri' })],
    bullet: { level: 0 },
    spacing: { before: 40, after: 40 },
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function spacer() {
  return new Paragraph({ text: '', spacing: { before: 80, after: 80 } });
}

function divider() {
  return new Paragraph({
    text: '',
    border: { bottom: { color: LIGHT_BLUE, space: 1, style: BorderStyle.SINGLE, size: 6 } },
    spacing: { before: 120, after: 120 },
  });
}

function screenshot(filename, caption) {
  const image = img(filename);
  if (!image) return [body(`[Screenshot: ${filename} not found]`)];
  const items = [
    new Paragraph({
      children: [image],
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 40 },
      border: {
        top: { color: LIGHT_BLUE, style: BorderStyle.SINGLE, size: 4 },
        bottom: { color: LIGHT_BLUE, style: BorderStyle.SINGLE, size: 4 },
        left: { color: LIGHT_BLUE, style: BorderStyle.SINGLE, size: 4 },
        right: { color: LIGHT_BLUE, style: BorderStyle.SINGLE, size: 4 },
      },
    }),
  ];
  if (caption) {
    items.push(new Paragraph({
      children: [new TextRun({ text: caption, size: 18, color: GRAY, italics: true, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 120 },
    }));
  }
  return items;
}

function twoColTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: rows.map(([label, value]) => new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, color: NAVY, font: 'Calibri' })] })],
          shading: { fill: LIGHT_GRAY, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
        }),
        new TableCell({
          width: { size: 70, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: value, size: 20, color: BLACK, font: 'Calibri' })] })],
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
        }),
      ],
    })),
  });
}

function definitionTable(rows) {
  // rows: [[term, definition], ...]
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([term, def], i) => new TableRow({
      children: [
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: term, bold: true, size: 20, color: DARK_BLUE, font: 'Calibri' })] })],
          shading: { fill: i % 2 === 0 ? 'EEF4FB' : WHITE, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
        }),
        new TableCell({
          width: { size: 75, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: def, size: 20, color: BLACK, font: 'Calibri' })] })],
          shading: { fill: i % 2 === 0 ? 'EEF4FB' : WHITE, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
        }),
      ],
    })),
  });
}

// ── Document sections ────────────────────────────────────────────────────────

function coverPage() {
  return [
    spacer(), spacer(), spacer(), spacer(),
    new Paragraph({
      children: [new TextRun({ text: COMPANY, size: 24, color: GRAY, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: APP, size: 72, bold: true, color: NAVY, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: SUBTITLE, size: 32, color: BLUE, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 480 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'END USER GUIDE', size: 52, bold: true, color: WHITE, font: 'Calibri', highlight: 'none' })],
      alignment: AlignmentType.CENTER,
      shading: { fill: BLUE, type: ShadingType.CLEAR },
      spacing: { before: 0, after: 480 },
    }),
    spacer(), spacer(), spacer(),
    new Paragraph({
      children: [new TextRun({ text: `Version 1.0   |   ${TODAY}`, size: 22, color: GRAY, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'IFIC Bank Bangladesh — IFRS 9 Compliant', size: 22, color: GRAY, font: 'Calibri', italics: true })],
      alignment: AlignmentType.CENTER,
    }),
    pageBreak(),
  ];
}

function tocPage() {
  const entries = [
    ['1.', 'Introduction'],
    ['2.', 'Getting Started'],
    ['3.', 'Navigating the Application'],
    ['4.', 'Module Guide'],
    ['    4.1', 'Dashboard'],
    ['    4.2', 'Data Ingestion'],
    ['    4.3', 'Segmentation'],
    ['    4.4', 'Stage Classification'],
    ['    4.5', 'SICR Assessment'],
    ['    4.6', 'ECL Calculation'],
    ['    4.7', 'Macro Scenarios'],
    ['    4.8', 'Provision & GL'],
    ['    4.9', 'Management Overlays'],
    ['    4.10', 'Reports'],
    ['    4.11', 'Model Governance'],
    ['    4.12', 'Audit Trail'],
    ['    4.13', 'User Management'],
    ['    4.14', 'Role Management'],
    ['5.', 'Common Tasks — Quick Reference'],
    ['6.', 'Troubleshooting'],
    ['7.', 'Glossary of Terms'],
  ];
  return [
    h1('Table of Contents'),
    divider(),
    ...entries.map(([num, title]) =>
      new Paragraph({
        children: [
          new TextRun({ text: `${num}  `, size: 22, bold: num.trim().length <= 2, color: num.startsWith('    ') ? GRAY : NAVY, font: 'Calibri' }),
          new TextRun({ text: title, size: 22, color: num.startsWith('    ') ? GRAY : BLACK, font: 'Calibri' }),
        ],
        spacing: { before: 60, after: 60 },
        indent: { left: num.startsWith('    ') ? convertInchesToTwip(0.3) : 0 },
      })
    ),
    pageBreak(),
  ];
}

function section1() {
  return [
    h1('1. Introduction'),
    divider(),
    h2('What is FinSight ECL?'),
    body('FinSight ECL is a specialist software platform built to help IFIC Bank Bangladesh calculate, manage, and report its Expected Credit Loss (ECL) provisions in full compliance with IFRS 9 and Bangladesh Bank regulatory requirements.'),
    body('In simple terms, every bank must set aside a financial cushion — called a provision — to cover loans that might not be fully repaid. FinSight ECL automates the complex calculations behind that cushion, replaces manual spreadsheets, and produces the reports your regulators and auditors need.'),
    h2('What is IFRS 9 ECL?'),
    body('IFRS 9 is an international accounting standard that requires banks to recognise loan losses earlier — before they actually happen — by estimating how much of their loan portfolio might go bad in the future.'),
    body('Under IFRS 9, every loan is placed in one of three stages:'),
    bullet('Stage 1 — Performing loans with no significant change in credit risk. The bank sets aside a 12-month ECL.'),
    bullet('Stage 2 — Loans where credit risk has significantly increased. The bank sets aside a lifetime ECL.'),
    bullet('Stage 3 — Loans that are already in default or credit-impaired. The bank sets aside a full lifetime ECL, usually based on a probability of default of 100%.'),
    body('ECL (Expected Credit Loss) is calculated using three inputs: PD (the probability the borrower will default), LGD (how much the bank would lose if they do), and EAD (the outstanding balance at the time of default). The system multiplies these together, adjusts for the bank\'s macroeconomic outlook, and produces the final provision amount.'),
    h2('How FinSight ECL Helps the Bank'),
    body('Bangladesh Bank requires all scheduled banks to maintain provisions in accordance with BRPD circulars. FinSight ECL bridges the gap between IFRS 9 (international) and BB CL-based (local regulatory) requirements by running both calculations side-by-side. At month end, the bank provisions to the higher of the two figures, ensuring full compliance with both frameworks.'),
    pageBreak(),
  ];
}

function section2() {
  return [
    h1('2. Getting Started'),
    divider(),
    h2('How to Log In'),
    ...screenshot('01_login.png', 'Figure 1 — FinSight ECL login screen'),
    body('The login screen is the first thing you see when you open FinSight ECL in your browser.'),
    step(1, 'Open your web browser (Google Chrome recommended) and go to the FinSight ECL address provided by your IT team.'),
    step(2, 'Enter your email address in the "Email address" field (e.g. analyst@finsight.com).'),
    step(3, 'Enter your password in the "Password" field.'),
    step(4, 'Click the blue "Sign in" button.'),
    step(5, 'If your credentials are correct, you will be taken to the Dashboard.'),
    spacer(),
    ...screenshot('01_login_error.png', 'Figure 2 — Login error shown when credentials are incorrect'),
    note('If you see "Invalid email or password", check your email address for typos and try your password again. Passwords are case-sensitive.'),
    tip('If you cannot remember your password, contact your System Administrator to have it reset.'),
    h2('How to Log Out'),
    body('To log out safely:'),
    step(1, 'Look at the top-right corner of the screen.'),
    step(2, 'Click "Sign out" next to your name.'),
    step(3, 'You will be returned to the login screen. Close the browser tab to fully end your session.'),
    h2('Screen Layout'),
    ...screenshot('02_dashboard.png', 'Figure 3 — Main screen layout showing sidebar, top bar, and content area'),
    body('The screen is divided into three areas:'),
    twoColTable([
      ['Left Sidebar', 'Navigation menu. Shows your bank name and all modules grouped by category. Click any item to go to that module.'],
      ['Top Bar', 'Shows the current date/time (Bangladesh time), your role badge (e.g. ADMIN), your name, and the Sign out link.'],
      ['Main Content Area', 'The large white area to the right. This is where each module\'s data and controls appear.'],
    ]),
    spacer(),
    pageBreak(),
  ];
}

function section3() {
  return [
    h1('3. Navigating the Application'),
    divider(),
    body('The left sidebar is your map of the entire system. It is divided into five groups:'),
    twoColTable([
      ['CORE', 'Dashboard, Data Ingestion, Segmentation — foundational data and overview.'],
      ['ECL ENGINE', 'Stage Classification, SICR Assessment, ECL Calculation, Macro Scenarios — the calculation pipeline.'],
      ['FINANCIALS', 'Provision & GL, Mgmt Overlays, Reports — financial output and reporting.'],
      ['GOVERNANCE', 'Model Governance, Audit Trail — compliance and model oversight.'],
      ['ADMIN', 'User Management, Role Management — system administration.'],
    ]),
    spacer(),
    body('Click any item in the sidebar to navigate to that module. The currently active page is highlighted with a blue background.'),
    body('At the top of the sidebar you will always see your bank name (IFIC BANK BANGLADESH) and the platform subtitle (IFRS 9 ECL Platform), confirming you are in the correct environment.'),
    note('Some menu items may not appear if your user role does not have access to that module. Contact your System Administrator if you believe you are missing access.'),
    pageBreak(),
  ];
}

function section4_dashboard() {
  return [
    h1('4. Module Guide'),
    divider(),
    h2('4.1  Dashboard'),
    ...screenshot('02_dashboard.png', 'Figure 4 — ECL Dashboard with KPI cards, charts, and scenario weights'),
    body('The Dashboard gives you an instant overview of the bank\'s entire loan portfolio and ECL position for the current reporting month. It is the first page you see after login.'),
    h3('Key Numbers at the Top'),
    twoColTable([
      ['Total ECL Provision', 'The total weighted ECL provision across all loans and all scenarios. This is the headline number the bank must hold as a provision.'],
      ['Stage 1 EAD', 'Exposure at Default for all Stage 1 (performing) loans, with portfolio percentage shown below.'],
      ['Stage 2 EAD', 'Exposure at Default for Stage 2 (SICR-triggered) loans.'],
      ['Stage 3 EAD', 'Exposure at Default for Stage 3 (defaulted) loans.'],
    ]),
    h3('Charts'),
    bullet('Stage Distribution (EAD, Cr) — Bar chart showing how much of the portfolio sits in each stage.'),
    bullet('ECL by Segment (Cr) — Bar chart showing the ECL contribution from each loan segment (SEG-01 through SEG-STF).'),
    h3('Scenario Weights'),
    body('Shows the percentage weight given to each macroeconomic scenario:'),
    bullet('Base Case — the central economic outlook (typically 60%).'),
    bullet('Optimistic — a better-than-expected economy (typically 20%).'),
    bullet('Pessimistic — a worse-than-expected economy (typically 20%).'),
    body('These weights are set on the Macro Scenarios page and are approved by the CRO before each month-end ECL run.'),
    h3('Recent Provision Runs'),
    body('Lists the most recent ECL provision runs, their status (DRAFT / APPROVED / LOCKED), and the total ECL amount. This section will show "No provision runs yet" at the start of a new month until a run is initiated.'),
    pageBreak(),
  ];
}

function section4_dataIngestion() {
  return [
    h2('4.2  Data Ingestion'),
    ...screenshot('03_data_ingestion.png', 'Figure 5 — Data Ingestion page showing source connections'),
    body('The Data Ingestion page is where the bank\'s loan data flows into FinSight ECL from external source systems. Before any ECL calculation can run, fresh data must be loaded for the reporting month.'),
    h3('Three Tabs'),
    bullet('Sources — Lists all connected data source systems with their last run time and status.'),
    bullet('Load History — A log of every data load that has run, with records extracted, loaded, and any failures.'),
    bullet('Data Quality — Shows any data quality issues detected during loading, such as missing fields or inconsistent DPD values.'),
    h3('Data Sources'),
    twoColTable([
      ['Temenos T24 Core Banking (CBS)', 'Main loan portfolio data — balances, DPD, CL status, maturity dates.'],
      ['Collateral Management System', 'Collateral values and types for each loan account.'],
      ['Internal Rating System (RATINGS)', 'Credit Risk Ratings (CRR) for each borrower.'],
      ['Bangladesh Bank Macro Data (MACRO)', 'Macroeconomic indicators uploaded as a CSV file.'],
    ]),
    h3('How to Trigger a Data Load'),
    step(1, 'Go to Data Ingestion from the sidebar.'),
    step(2, 'On the Sources tab, find the data source you want to refresh.'),
    step(3, 'Click the blue "Trigger" button on the right side of that source row.'),
    step(4, 'A confirmation toast message will appear at the top of the screen.'),
    step(5, 'Click the "Load History" tab to monitor the progress of the load.'),
    h3('How to Upload Macro Data'),
    step(1, 'Click the "Upload Macro CSV" button at the top right of the page.'),
    step(2, 'Select the CSV file from your computer.'),
    step(3, 'The system will confirm the number of rows processed.'),
    note('The CSV must follow the Bangladesh Bank macro data format. Contact your IT team for the template.'),
    pageBreak(),
  ];
}

function section4_segmentation() {
  return [
    h2('4.3  Segmentation'),
    ...screenshot('04_segmentation.png', 'Figure 6 — Segmentation page showing loan segments with LGD and CCF parameters'),
    body('Segmentation defines how the bank groups its loans for ECL calculation. Each segment has its own assessment method, collateral type, LGD floor, and credit conversion factor (CCF). These parameters directly affect the ECL calculated for every loan in that segment.'),
    h3('Three Tabs'),
    bullet('Segments — Lists all loan segments with their parameters and status.'),
    bullet('PD Parameters — Shows the probability of default observations and weights for each segment.'),
    bullet('LGD Rules — Shows the Loss Given Default tiers (Over-Secured, Partial, Unsecured) for each segment.'),
    h3('Understanding the Segments Table'),
    twoColTable([
      ['ID', 'The unique segment code (e.g. SEG-01, SEG-03, SEG-STF).'],
      ['Method', 'How ECL is calculated: INDIVIDUAL (loan-by-loan), COLLECTIVE/POOL (group average), or COHORT.'],
      ['LGD Floor', 'The minimum loss percentage the bank assumes even for fully secured loans.'],
      ['CCF', 'Credit Conversion Factor — how much of any undrawn credit line to include in the EAD.'],
      ['Status', 'Active = included in ECL calculations. Inactive = excluded.'],
    ]),
    note('Only users with the ANALYST role or above can edit segment parameters. Changes take effect on the next ECL run.'),
    pageBreak(),
  ];
}

function section4_staging() {
  return [
    h2('4.4  Stage Classification'),
    ...screenshot('05_staging.png', 'Figure 7 — Stage Classification showing loan-level stage assignments with override controls'),
    body('Stage Classification is where each loan account is assigned to Stage 1, Stage 2, or Stage 3 based on IFRS 9 criteria. The system runs this automatically but analysts can review and submit overrides where business judgement is needed.'),
    h3('Running a Staging Calculation'),
    step(1, 'Select the reporting month using the month picker at the top right (e.g. April 2026).'),
    step(2, 'Click the blue "Run Staging" button.'),
    step(3, 'Wait for the system to complete. A success notification will appear.'),
    step(4, 'The table will refresh showing the updated stage for every loan.'),
    h3('Filtering the Loan List'),
    body('Use the stage filter buttons (All / Stage 1 / Stage 2 / Stage 3) to see only the loans in a specific stage. Tick "Overrides only" to see only loans where a manual override has been submitted.'),
    h3('Understanding the Columns'),
    twoColTable([
      ['LOAN ID', 'The unique loan reference number (e.g. LN-LC-0001).'],
      ['STAGE', 'The assigned stage — Stage 1 (green), Stage 2 (amber), Stage 3 (red).'],
      ['DPD', 'Days Past Due — number of days the loan is overdue. Orange/red when above 30.'],
      ['CL STATUS', 'Bangladesh Bank Classification Status: STD, SMA, SS, DF, BL.'],
      ['CRR', 'Credit Risk Rating assigned by the internal rating system.'],
      ['SICR', 'Shows "SICR" badge if a Significant Increase in Credit Risk has been detected.'],
      ['OVERRIDE', 'Shows "Pending" if an override has been submitted awaiting approval.'],
    ]),
    h3('How to Submit a Stage Override'),
    step(1, 'Find the loan you want to override in the list.'),
    step(2, 'Click the "Override" button at the end of that loan\'s row.'),
    step(3, 'Select the new stage and enter a reason in the form that appears.'),
    step(4, 'Click Submit. The override status will show "Pending" until a CRO approves it.'),
    h3('How to Approve an Override (CRO only)'),
    step(1, 'Find a loan with status "Pending" in the Override column.'),
    step(2, 'Click the green "Approve" button on that row.'),
    step(3, 'The override is applied immediately.'),
    note('Stage overrides are fully recorded in the Audit Trail for regulatory review.'),
    pageBreak(),
  ];
}

function section4_sicr() {
  return [
    h2('4.5  SICR Assessment'),
    ...screenshot('06_sicr.png', 'Figure 8 — SICR Assessment showing credit risk indicators per loan'),
    body('SICR stands for Significant Increase in Credit Risk. This page shows the results of the system\'s evaluation of whether each loan has experienced a meaningful deterioration in credit quality since it was first originated — the key trigger for moving a loan from Stage 1 to Stage 2.'),
    h3('Three Tabs'),
    bullet('Assessment Results — Loan-by-loan SICR flag results for the selected month.'),
    bullet('Factor Summary — Aggregated counts of how many loans triggered SICR, by factor type.'),
    bullet('Rules Config — The threshold settings used by the SICR engine (DPD limits, CRR thresholds, etc.).'),
    h3('Reading the Results'),
    twoColTable([
      ['SICR FLAG', '"Pass" (green) = no significant increase detected. "SICR" (red) = significant increase detected.'],
      ['DEFAULT', 'Marked if the loan meets the IFRS 9 definition of default (DPD 90+ or BL classification).'],
      ['OVERRIDE', '"Yes" if a manual override has been applied to this loan\'s classification.'],
    ]),
    body('Tick "Show SICR-triggered only" to filter the list to only loans where SICR has been triggered, making it easier to review potential Stage 2 movements.'),
    h3('Rules Configuration'),
    body('The Rules Config tab shows the thresholds applied by the SICR engine:'),
    twoColTable([
      ['DPD Stage 2 Threshold', 'Default: 30 days. Loans overdue by 30+ days move to Stage 2.'],
      ['DPD Stage 3 Threshold', 'Default: 90 days. Loans overdue by 90+ days move to Stage 3.'],
      ['CRR Stage 2 Threshold', 'CRR rating at which SICR is triggered.'],
      ['Watchlist / Forbearance', 'Both automatically trigger SICR when flagged by the CBS.'],
    ]),
    pageBreak(),
  ];
}

function section4_ecl() {
  return [
    h2('4.6  ECL Calculation'),
    ...screenshot('07_ecl_calc.png', 'Figure 9 — ECL Calculation page showing per-loan PD, LGD, EAD, and weighted ECL'),
    body('The ECL Calculation page is the heart of the system. It shows the Expected Credit Loss computed for every single loan, broken down by scenario, and allows you to run a fresh ECL calculation for any reporting month.'),
    h3('Running an ECL Calculation'),
    step(1, 'Select the reporting month using the month picker at the top right.'),
    step(2, 'Select the run type from the dropdown: MONTH_END (normal), INTERIM, or DUAL_RUN.'),
    step(3, 'Click the blue "Run ECL" button.'),
    step(4, 'The system will calculate ECL for all 120+ loans. This usually takes 30–60 seconds.'),
    step(5, 'Once complete, the Results table will update with the new figures.'),
    h3('Understanding the Results Table'),
    twoColTable([
      ['EAD', 'Exposure at Default — the outstanding loan balance used in the calculation (BDT Crore).'],
      ['PD 12M', 'Probability of Default over the next 12 months (shown as a percentage).'],
      ['LGD', 'Loss Given Default — the estimated loss rate if the loan defaults (shown as a percentage).'],
      ['ECL (WEIGHTED)', 'The final weighted ECL figure, blending Base, Optimistic and Pessimistic scenarios.'],
      ['ECL (BASE)', 'ECL under the Base macroeconomic scenario.'],
      ['ECL (OPT.)', 'ECL under the Optimistic macroeconomic scenario.'],
      ['ECL (PESS.)', 'ECL under the Pessimistic macroeconomic scenario.'],
    ]),
    h3('Three Tabs'),
    bullet('Results — Loan-level ECL results filterable by stage.'),
    bullet('Portfolio Summary — Aggregated ECL totals by segment and stage.'),
    bullet('LGD Parameters — The LGD tiers and haircuts applied in the calculation.'),
    tip('Use the Stage 1 / Stage 2 / Stage 3 filter buttons to focus on specific risk buckets.'),
    pageBreak(),
  ];
}

function section4_macro() {
  return [
    h2('4.7  Macro Scenarios'),
    ...screenshot('08_macro_scenarios.png', 'Figure 10 — Macro Scenarios page with BASE, OPTIMISTIC, and PESSIMISTIC scenario cards'),
    body('Macro Scenarios define the forward-looking economic assumptions that are "baked into" the ECL calculation. IFRS 9 requires banks to consider multiple economic futures and weight their ECL accordingly. FinSight ECL supports three scenarios: Base, Optimistic, and Pessimistic.'),
    h3('Scenario Cards'),
    body('The top of the page shows a card for each scenario with:'),
    bullet('Weight (%) — how much influence this scenario has on the final weighted ECL.'),
    bullet('GDP Growth — Bangladesh GDP growth assumed under this scenario.'),
    bullet('CPI — Consumer Price Index (inflation) assumed.'),
    bullet('Multiplier — the factor applied to the base ECL. 1.0 = no adjustment; 1.25 = 25% more ECL; 0.88 = 12% less.'),
    bullet('Status — APPROVED / DRAFT / PENDING.'),
    h3('Default Scenario Settings'),
    twoColTable([
      ['BASE', 'Weight 60%, GDP 6.2%, CPI 9.0%, Multiplier 1.0000'],
      ['OPTIMISTIC', 'Weight 20%, GDP 7.8%, CPI 6.5%, Multiplier 0.8800'],
      ['PESSIMISTIC', 'Weight 20%, GDP 4.2%, CPI 12.0%, Multiplier 1.2500'],
    ]),
    h3('Sensitivity Analysis Tab'),
    body('The Sensitivity Analysis tab shows how the total ECL would change if scenario weights were adjusted — useful for stress-testing and management discussions.'),
    note('Scenario weights must sum to 100%. Only users with the CRO role or above can approve scenario changes.'),
    pageBreak(),
  ];
}

function section4_provision() {
  return [
    h2('4.8  Provision & GL'),
    ...screenshot('09_provision_gl.png', 'Figure 11 — Provision & GL page showing provision runs'),
    body('The Provision & GL page manages the official month-end provision run — the formal record of how much the bank is setting aside — and generates the journal entries (GL entries) for the bank\'s accounting system.'),
    h3('Three Tabs'),
    bullet('Provision Runs — Lists all provision runs for the selected month with their status and total ECL.'),
    bullet('Movement Waterfall — Shows the movement in ECL from the prior month to the current month, broken down by type (new originations, stage migrations, cures, write-offs, etc.).'),
    bullet('GL Entries — The double-entry journal entries (Debit/Credit) generated for the bank\'s General Ledger system.'),
    h3('Provision Run Statuses'),
    twoColTable([
      ['DRAFT', 'The run has been initiated but not yet reviewed.'],
      ['APPROVED', 'The CRO has reviewed and approved the provision figures.'],
      ['LOCKED', 'The run has been locked for the reporting period — no further changes allowed.'],
    ]),
    h3('How to Initiate a Provision Run'),
    step(1, 'Make sure the ECL Calculation has been run successfully for the month.'),
    step(2, 'Go to Provision & GL from the sidebar.'),
    step(3, 'Select the reporting month.'),
    step(4, 'Click "Initiate Provision Run" (or "Run ECL" if a combined button is shown).'),
    step(5, 'The run will appear in the Provision Runs table with status DRAFT.'),
    h3('How to Approve a Provision Run (CRO only)'),
    step(1, 'Find the DRAFT run in the Provision Runs table.'),
    step(2, 'Review the total ECL and waterfall movements.'),
    step(3, 'Click "Approve" to change the status to APPROVED.'),
    step(4, 'GL entries are automatically generated and are visible on the GL Entries tab.'),
    pageBreak(),
  ];
}

function section4_overlays() {
  return [
    h2('4.9  Management Overlays'),
    ...screenshot('10_overlays.png', 'Figure 12 — Management Overlays page showing active and expired adjustments'),
    body('Management Overlays allow the bank\'s credit risk team to apply expert judgement adjustments on top of the model-calculated ECL. These are used when the model output does not fully capture a specific risk — for example, a sector-wide event or a known large borrower issue.'),
    h3('Overlay Types'),
    twoColTable([
      ['MACRO_MULTIPLIER_ADJ', 'Adjusts the macro scenario multiplier for a specific segment.'],
      ['SECTOR', 'Applies an ECL adjustment across an entire industry sector.'],
      ['PD_CAP_FLOOR', 'Sets a floor or ceiling on the PD used for a segment.'],
      ['LGD_HAIRCUT', 'Adjusts the LGD haircut applied to collateral.'],
      ['STAGE', 'Forces a specific loan into a particular stage regardless of model output.'],
    ]),
    h3('Overlay Statuses'),
    twoColTable([
      ['PENDING', 'Submitted by an analyst, awaiting CRO approval.'],
      ['APPROVED', 'Approved by CRO and currently active — included in ECL calculation.'],
      ['REJECTED', 'Rejected by CRO — not applied.'],
      ['EXPIRED', 'Past the end date specified when the overlay was created.'],
    ]),
    h3('How to Create a New Overlay'),
    ...screenshot('10_overlays_modal.png', 'Figure 13 — New Overlay form'),
    step(1, 'Click the "+ New Overlay" button at the top right of the page.'),
    step(2, 'Select the Overlay Type from the dropdown.'),
    step(3, 'Select the Segment or enter the Loan ID this overlay applies to.'),
    step(4, 'Enter the adjustment factor (e.g. 1.10 means increase ECL by 10%).'),
    step(5, 'Enter the start and end period (format: YYYYMM).'),
    step(6, 'Enter a clear justification explaining why the overlay is needed.'),
    step(7, 'Click Submit. The overlay status will show as PENDING until CRO approval.'),
    note('All overlays are recorded in the Audit Trail. Every submission and approval is tracked with the user\'s name and timestamp.'),
    pageBreak(),
  ];
}

function section4_reports() {
  return [
    h2('4.10  Reports'),
    ...screenshot('11_reports.png', 'Figure 14 — Reports page showing available report types'),
    body('The Reports page gives you access to all standard IFRS 9, regulatory, disclosure, and accounting reports. Reports can be generated on-screen or downloaded as formatted Excel (.xlsx) files.'),
    h3('Available Reports'),
    twoColTable([
      ['ECL Portfolio Summary (IFRS9)', 'Stage-wise ECL totals by segment. The main IFRS 9 disclosure table.'],
      ['Staging Classification Summary (IFRS9)', 'Number of loans and percentages in each stage, with override counts.'],
      ['Macro Scenario Sensitivity (IFRS9)', 'ECL sensitivity to scenario weights. Used for board presentations.'],
      ['Bangladesh Bank Regulatory Provision (REGULATORY)', 'Provision schedule in BB CL format per BRPD Circular — submitted to the regulator.'],
      ['IFRS 7 Financial Instruments Disclosure (DISCLOSURE)', 'Credit risk exposure tables required for the annual report.'],
      ['GL Entry Summary (ACCOUNTING)', 'Provision accounting entries for import into the GL system.'],
    ]),
    h3('How to Generate and Download a Report'),
    step(1, 'Select the reporting month using the month picker at the top right.'),
    step(2, 'On the Report Library tab, find the report you want.'),
    step(3, 'Click "Generate (YYYYMM)" to generate the report and see a row count confirmation.'),
    step(4, 'Click "Excel" (with down arrow icon) to download the report as a formatted .xlsx file.'),
    step(5, 'The file will download to your computer automatically.'),
    tip('You can also view Bangladesh Bank regulatory data and IFRS 7 disclosure tables directly on-screen by clicking the BB Regulatory and IFRS 7 Disclosure tabs.'),
    pageBreak(),
  ];
}

function section4_governance() {
  return [
    h2('4.11  Model Governance'),
    ...screenshot('12_governance.png', 'Figure 15 — Model Governance page showing the model registry'),
    body('Model Governance tracks all the statistical models used by FinSight ECL — PD models, LGD models, EAD models, and macro overlay models. It ensures every model in production has been approved, documented, and periodically validated.'),
    h3('Three Tabs'),
    bullet('Model Registry — Lists all models with type, method, version, and production status.'),
    bullet('Backtesting — Shows the results of backtesting runs that compare model predictions to actual outcomes.'),
    bullet('Roadmap — Shows planned model development and upgrade activities.'),
    h3('Model Statuses'),
    twoColTable([
      ['PRODUCTION', 'The model is live and being used in ECL calculations.'],
      ['VALIDATION', 'The model has been submitted for independent validation. Cannot be used in production yet.'],
      ['DEVELOPMENT', 'The model is still being built and tested.'],
      ['RETIRED', 'An older version replaced by a newer model.'],
    ]),
    h3('How to Register a New Model'),
    step(1, 'Click the "+ Register Model" button at the top right.'),
    step(2, 'Fill in the Model ID, name, type (PD/LGD/EAD/MACRO), and method description.'),
    step(3, 'Upload the model documentation PDF if available.'),
    step(4, 'Click Save. The model will appear in the registry with status DEVELOPMENT.'),
    step(5, 'Once validated, a user with approval rights can click "Approve" to move it to PRODUCTION.'),
    pageBreak(),
  ];
}

function section4_audit() {
  return [
    h2('4.12  Audit Trail'),
    ...screenshot('13_audit.png', 'Figure 16 — Audit Trail showing immutable log of all system events'),
    body('The Audit Trail is a complete, tamper-proof log of everything that happens in FinSight ECL. Every user action, data load, calculation run, approval, and override is recorded here with the exact timestamp and user. This log is critical for internal audits and regulatory inspections.'),
    h3('Two Tabs'),
    bullet('Audit Log — Chronological log of all events in the system.'),
    bullet('Risk Register — A list of identified IFRS 9 implementation risks with ratings and mitigation plans.'),
    h3('Common Event Types'),
    twoColTable([
      ['USER_LOGIN', 'A user has logged in to the system.'],
      ['STAGING_RUN_COMPLETE', 'A stage classification run has finished.'],
      ['REPORT_GENERATED', 'A report has been generated.'],
      ['PROVISION_RUN_COMPLETE', 'A month-end provision run has been completed.'],
      ['SCENARIO_APPROVE', 'A macro scenario has been approved.'],
      ['STAGE_OVERRIDE', 'A stage override has been submitted.'],
      ['OVERRIDE_APPROVE', 'A stage override has been approved by CRO.'],
    ]),
    h3('How to Search the Audit Log'),
    step(1, 'Go to Audit Trail from the sidebar.'),
    step(2, 'Type an event type in the "Filter by event type" box (e.g. STAGING_RUN).'),
    step(3, 'Type an entity type in the "Filter by entity type" box (e.g. loan, report).'),
    step(4, 'The table will filter in real time as you type.'),
    note('The audit log cannot be edited or deleted by any user, including System Administrators. This is by design to ensure regulatory integrity.'),
    pageBreak(),
  ];
}

function section4_users() {
  return [
    h2('4.13  User Management'),
    ...screenshot('14_user_management.png', 'Figure 17 — User Management page showing all system users'),
    body('User Management allows System Administrators to create and manage user accounts, assign roles, and deactivate users who no longer need access.'),
    h3('The Users Table'),
    twoColTable([
      ['User', 'Full name and email address of the user.'],
      ['Roles', 'The role(s) assigned to the user (e.g. ANALYST, CRO, SUPER_ADMIN).'],
      ['Status', 'Active (green) = can log in. Inactive (grey) = login blocked.'],
      ['Last Login', 'Date and time of the user\'s most recent login. "Never" means the user has not logged in yet.'],
    ]),
    h3('How to Create a New User'),
    step(1, 'Click the "+ Create User" button at the top right.'),
    step(2, 'Enter the user\'s full name and email address.'),
    step(3, 'Enter a temporary password (the user should change this on first login).'),
    step(4, 'Click Create. The user will appear in the list.'),
    step(5, 'Click "Roles" next to the new user to assign them the appropriate role.'),
    h3('How to Deactivate a User'),
    step(1, 'Find the user in the list.'),
    step(2, 'Click the red "Deactivate" link at the end of their row.'),
    step(3, 'Confirm the action. The user\'s status changes to Inactive and they can no longer log in.'),
    note('Deactivated users are not deleted — their activity history is preserved in the Audit Trail.'),
    pageBreak(),
  ];
}

function section4_roles() {
  return [
    h2('4.14  Role Management'),
    ...screenshot('15_role_management.png', 'Figure 18 — Role Management showing the four system roles'),
    body('Role Management defines what each user type can see and do in the system. FinSight ECL comes with four built-in system roles. Administrators can also create custom roles with specific permission combinations.'),
    h3('Built-in System Roles'),
    twoColTable([
      ['SUPER_ADMIN', 'Full access to everything — all modules, all actions, user and role management.'],
      ['CRO', 'Chief Risk Officer — can approve overrides, approve provision runs, approve scenarios, view all data.'],
      ['ANALYST', 'ECL Analyst — can run calculations, submit overrides, generate reports. Cannot approve.'],
      ['VIEWER', 'Read-only access — can view all data and reports but cannot run or change anything.'],
    ]),
    h3('How to View a Role\'s Permissions'),
    step(1, 'Click the "Permissions" link next to any role.'),
    step(2, 'A panel or page will show the full list of permissions assigned to that role.'),
    h3('How to Create a Custom Role'),
    step(1, 'Click the "+ Create Role" button at the top right.'),
    step(2, 'Enter a name and description for the new role.'),
    step(3, 'Click Create, then click "Permissions" next to the new role.'),
    step(4, 'Select the specific permissions you want to grant.'),
    step(5, 'Save. The role is now available to assign to users.'),
    pageBreak(),
  ];
}

function section5() {
  return [
    h1('5. Common Tasks — Quick Reference'),
    divider(),
    h2('Month-End ECL Workflow'),
    body('Follow these steps every month end in order. Each step must complete successfully before starting the next.'),
    new Paragraph({
      children: [
        new TextRun({ text: 'Day 1 — Data Loading', bold: true, size: 24, color: NAVY, font: 'Calibri' }),
      ],
      spacing: { before: 160, after: 80 },
    }),
    step(1, 'Go to Data Ingestion. Trigger all four data sources (T24, Collateral, Ratings, Macro).'),
    step(2, 'Check the Load History tab — all loads should show status COMPLETED.'),
    step(3, 'Check the Data Quality tab for any issues. Resolve critical issues before proceeding.'),
    new Paragraph({
      children: [new TextRun({ text: 'Day 2 — Staging & SICR', bold: true, size: 24, color: NAVY, font: 'Calibri' })],
      spacing: { before: 160, after: 80 },
    }),
    step(4, 'Go to Stage Classification. Select the reporting month. Click "Run Staging".'),
    step(5, 'Review the staging results. Check Stage 2 and Stage 3 loans for accuracy.'),
    step(6, 'Submit overrides for any loans that require analyst judgement.'),
    step(7, 'Ask the CRO to approve all pending overrides.'),
    step(8, 'Go to SICR Assessment. Review the Factor Summary for unexpected movements.'),
    new Paragraph({
      children: [new TextRun({ text: 'Day 3 — ECL Calculation', bold: true, size: 24, color: NAVY, font: 'Calibri' })],
      spacing: { before: 160, after: 80 },
    }),
    step(9, 'Go to Macro Scenarios. Confirm scenario weights are set correctly for the month.'),
    step(10, 'Ensure all three scenarios have status APPROVED. If not, ask the CRO to approve.'),
    step(11, 'Go to ECL Calculation. Select the month and type MONTH_END. Click "Run ECL".'),
    step(12, 'Review the Portfolio Summary. Compare to prior month — large changes need explanation.'),
    new Paragraph({
      children: [new TextRun({ text: 'Day 4 — Provision & Reporting', bold: true, size: 24, color: NAVY, font: 'Calibri' })],
      spacing: { before: 160, after: 80 },
    }),
    step(13, 'Go to Provision & GL. Initiate a provision run.'),
    step(14, 'Review the Movement Waterfall — understand what drove the change vs last month.'),
    step(15, 'Ask the CRO to review and click "Approve" on the provision run.'),
    step(16, 'Go to Reports. Generate and download the BB Regulatory Provision report for submission.'),
    step(17, 'Generate and download the ECL Portfolio Summary and IFRS 7 Disclosure reports.'),
    step(18, 'The Finance team locks the provision run — status changes to LOCKED.'),
    divider(),
    h2('Other Common Tasks'),
    twoColTable([
      ['Add a management overlay', 'Overlays → + New Overlay → fill form → Submit → await CRO approval'],
      ['Check audit log for a loan', 'Audit Trail → type the Loan ID in the entity filter box'],
      ['Create a new user', 'User Management → + Create User → fill details → assign role'],
      ['Approve a stage override', 'Stage Classification → find Pending row → click Approve (CRO only)'],
      ['Download an Excel report', 'Reports → select month → click Excel button on the desired report'],
      ['Register a new ECL model', 'Model Governance → + Register Model → fill form → submit for validation'],
    ]),
    pageBreak(),
  ];
}

function section6() {
  return [
    h1('6. Troubleshooting'),
    divider(),
    twoColTable([
      ['Page shows no data', 'The data may not have been loaded for this reporting month. Go to Data Ingestion and trigger all sources. Then re-run the staging and ECL calculations.'],
      ['ECL run failed', 'Check that: (a) data has been loaded, (b) macro scenarios are in APPROVED status, (c) all segments are active. Contact your IT team if the error persists.'],
      ['Cannot approve a provision run', 'Only users with the CRO role can approve provision runs. Check your role in User Management.'],
      ['Report download shows 0 rows', 'The ECL calculation may not have been run for the selected month. Go to ECL Calculation, select the correct month, and click Run ECL first.'],
      ['Cannot log in', 'Check that Caps Lock is off. Try resetting your password by contacting the System Administrator. If your account shows Inactive, ask Admin to reactivate it.'],
      ['A loan is in the wrong stage', 'Submit a stage override on the Stage Classification page with a clear justification. The CRO will review and approve or reject.'],
      ['Seeing "No provision runs yet"', 'No run has been initiated for the selected month. An Analyst or CRO needs to run the ECL calculation first, then initiate a provision run.'],
      ['SICR triggered unexpectedly', 'Check the Rules Config tab on the SICR Assessment page to see the thresholds. Also check the loan\'s DPD, CRR, watchlist, and forbearance flags in the staging results.'],
    ]),
    pageBreak(),
  ];
}

function section7() {
  return [
    h1('7. Glossary of Terms'),
    divider(),
    definitionTable([
      ['BB', 'Bangladesh Bank — the central bank and primary regulator.'],
      ['BRPD', 'Banking Regulation and Policy Department — the BB department that issues provisioning circulars.'],
      ['CCF', 'Credit Conversion Factor — the percentage of undrawn credit lines included in EAD.'],
      ['CL Status', 'Bangladesh Bank Classification Status: STD (Standard), SMA (Special Mention), SS (Sub-Standard), DF (Doubtful), BL (Bad & Loss).'],
      ['CRR', 'Credit Risk Rating — internal rating assigned to each borrower (1 = strongest, 8 = weakest).'],
      ['CRO', 'Chief Risk Officer — the senior bank official responsible for approving ECL provisions.'],
      ['DPD', 'Days Past Due — the number of calendar days a loan payment is overdue.'],
      ['EAD', 'Exposure at Default — the expected outstanding balance at the time of default.'],
      ['ECL', 'Expected Credit Loss — the probability-weighted estimate of credit losses over a defined horizon.'],
      ['EIR', 'Effective Interest Rate — the rate used to discount future cash flows for ECL purposes.'],
      ['IFRS 9', 'International Financial Reporting Standard 9 — the global standard for financial instruments and ECL provisioning.'],
      ['LGD', 'Loss Given Default — the percentage of the EAD the bank expects to lose if a borrower defaults.'],
      ['Macro Multiplier', 'A factor applied to model ECL to reflect macroeconomic conditions. 1.0 = neutral; > 1.0 = worse outlook.'],
      ['Overlay', 'A management adjustment applied on top of model-calculated ECL to reflect expert judgement.'],
      ['PD', 'Probability of Default — the likelihood that a borrower will default within a given period.'],
      ['Provision Run', 'The formal monthly calculation that determines how much ECL the bank recognises in its financial statements.'],
      ['SICR', 'Significant Increase in Credit Risk — the IFRS 9 trigger for moving a loan from Stage 1 to Stage 2.'],
      ['Stage 1', '12-month ECL. Performing loans with no significant change in credit quality since origination.'],
      ['Stage 2', 'Lifetime ECL. Loans where credit risk has significantly increased since origination.'],
      ['Stage 3', 'Lifetime ECL, PD = 100%. Loans that are credit-impaired (in default).'],
      ['Waterfall', 'The movement analysis showing how ECL changed from one month to the next, broken down by cause.'],
      ['Write-off', 'The removal of a loan from the balance sheet because recovery is considered nil.'],
    ]),
    spacer(),
    divider(),
    new Paragraph({
      children: [new TextRun({ text: `${COMPANY}  |  ${APP} End User Guide  |  v1.0  |  ${TODAY}`, size: 18, color: GRAY, italics: true, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
    }),
  ];
}

// ── Assemble document ────────────────────────────────────────────────────────
async function buildDoc() {
  console.log('Building DOCX...');

  const sections = [
    ...coverPage(),
    ...tocPage(),
    ...section1(),
    ...section2(),
    ...section3(),
    ...section4_dashboard(),
    ...section4_dataIngestion(),
    ...section4_segmentation(),
    ...section4_staging(),
    ...section4_sicr(),
    ...section4_ecl(),
    ...section4_macro(),
    ...section4_provision(),
    ...section4_overlays(),
    ...section4_reports(),
    ...section4_governance(),
    ...section4_audit(),
    ...section4_users(),
    ...section4_roles(),
    ...section5(),
    ...section6(),
    ...section7(),
  ].filter(Boolean);

  const doc = new Document({
    title: `${APP} End User Guide`,
    description: `${SUBTITLE} — End User Guide — ${COMPANY}`,
    creator: COMPANY,
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22, color: BLACK },
        },
        heading1: {
          run: { font: 'Calibri', size: 36, bold: true, color: NAVY },
          paragraph: { spacing: { before: 400, after: 200 } },
        },
        heading2: {
          run: { font: 'Calibri', size: 28, bold: true, color: DARK_BLUE },
          paragraph: { spacing: { before: 280, after: 140 } },
        },
        heading3: {
          run: { font: 'Calibri', size: 24, bold: true, color: BLUE },
          paragraph: { spacing: { before: 200, after: 100 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.1),
            right: convertInchesToTwip(1.1),
          },
        },
        titlePage: true,
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [
              new TextRun({ text: `${APP}  |  IFRS 9 ECL Platform`, size: 18, color: GRAY, font: 'Calibri' }),
              new TextRun({ text: '\t', size: 18 }),
              new TextRun({ text: COMPANY, size: 18, color: GRAY, font: 'Calibri' }),
            ],
            border: { bottom: { color: LIGHT_BLUE, style: BorderStyle.SINGLE, size: 4, space: 4 } },
            tabStops: [{ type: 'right', position: convertInchesToTwip(6.3) }],
          })],
        }),
        first: new Header({ children: [new Paragraph({ text: '' })] }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: COMPANY, size: 18, color: GRAY, font: 'Calibri' }),
              new TextRun({ text: '\t', size: 18 }),
              new TextRun({ text: 'Page ', size: 18, color: GRAY, font: 'Calibri' }),
              new SimpleField('PAGE'),
            ],
            border: { top: { color: LIGHT_BLUE, style: BorderStyle.SINGLE, size: 4, space: 4 } },
            tabStops: [{ type: 'right', position: convertInchesToTwip(6.3) }],
          })],
        }),
        first: new Footer({ children: [new Paragraph({ text: '' })] }),
      },
      children: sections,
    }],
  });

  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(OUT, buf);
  await patchDocx(OUT);
  console.log(`\nSaved: ${OUT}  (${(buf.length / 1024).toFixed(0)} KB)`);
}

buildDoc().catch(err => { console.error(err); process.exit(1); });

// ─── POST-PROCESS: fix docx-package bugs for Word compatibility ────────────────
// The docx npm package emits cstate="none" on a:blip (invalid OOXML) and
// noChangeArrowheads on pic:picLocks (deprecated).  Both cause Word to refuse
// to open the file.  We fix them in-place using the adm-zip module.
async function patchDocx(filePath) {
  let AdmZip;
  try { AdmZip = require('adm-zip'); } catch {
    console.log('  (adm-zip not found — skipping Word-compat patch)');
    return;
  }
  const zip = new AdmZip(filePath);
  const entry = zip.getEntry('word/document.xml');
  if (!entry) return;
  let xml = entry.getData().toString('utf8');
  let changed = false;
  const before = xml;
  xml = xml.replace(/ cstate="none"/g, '');
  xml = xml.replace(/ noChangeArrowheads="1"/g, '');
  if (xml !== before) { changed = true; }
  if (changed) {
    zip.updateFile('word/document.xml', Buffer.from(xml, 'utf8'));
    zip.writeZip(filePath);
    console.log('  Applied Word-compat patch (removed invalid cstate/noChangeArrowheads)');
  }
}
