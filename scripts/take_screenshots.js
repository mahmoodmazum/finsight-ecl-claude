/**
 * Playwright screenshot script for FinSight ECL
 * Logs in and captures every page/state at full resolution
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = path.join(__dirname, '..', 'screenshots');
const CREDS = { email: 'admin@finsight.com', password: 'Admin@123456' };

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function ss(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log('  saved:', name + '.png');
}

async function waitReady(page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // ── LOGIN PAGE ─────────────────────────────────────────────────────────────
  console.log('\n[01] Login page');
  await page.goto(`${BASE_URL}/login`);
  await waitReady(page);
  await ss(page, '01_login');

  // Login with wrong password to capture error state
  await page.fill('input[type="email"]', 'admin@finsight.com');
  await page.fill('input[type="password"]', 'wrongpassword');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  await ss(page, '01_login_error');

  // Correct login
  await page.fill('input[type="password"]', CREDS.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 });
  await waitReady(page);

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  console.log('\n[02] Dashboard');
  await ss(page, '02_dashboard');

  // ── DATA INGESTION ─────────────────────────────────────────────────────────
  console.log('\n[03] Data Ingestion');
  await page.goto(`${BASE_URL}/data-ingestion`);
  await waitReady(page);
  await ss(page, '03_data_ingestion');

  // ── SEGMENTATION ───────────────────────────────────────────────────────────
  console.log('\n[04] Segmentation');
  await page.goto(`${BASE_URL}/segmentation`);
  await waitReady(page);
  await ss(page, '04_segmentation');

  // ── STAGE CLASSIFICATION ───────────────────────────────────────────────────
  console.log('\n[05] Stage Classification');
  await page.goto(`${BASE_URL}/staging`);
  await waitReady(page);
  await ss(page, '05_staging');

  // ── SICR ASSESSMENT ────────────────────────────────────────────────────────
  console.log('\n[06] SICR Assessment');
  await page.goto(`${BASE_URL}/sicr`);
  await waitReady(page);
  await ss(page, '06_sicr');

  // ── ECL CALCULATION ────────────────────────────────────────────────────────
  console.log('\n[07] ECL Calculation');
  await page.goto(`${BASE_URL}/ecl-calc`);
  await waitReady(page);
  await ss(page, '07_ecl_calc');

  // ── MACRO SCENARIOS ────────────────────────────────────────────────────────
  console.log('\n[08] Macro Scenarios');
  await page.goto(`${BASE_URL}/macro-scenarios`);
  await waitReady(page);
  await ss(page, '08_macro_scenarios');

  // ── PROVISION & GL ─────────────────────────────────────────────────────────
  console.log('\n[09] Provision & GL');
  await page.goto(`${BASE_URL}/provision`);
  await waitReady(page);
  await ss(page, '09_provision_gl');

  // ── MANAGEMENT OVERLAYS ────────────────────────────────────────────────────
  console.log('\n[10] Management Overlays');
  await page.goto(`${BASE_URL}/overlays`);
  await waitReady(page);
  await ss(page, '10_overlays');

  // Try to open Add Overlay modal
  const addBtn = page.locator('button').filter({ hasText: /add|new|create/i }).first();
  if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await addBtn.click();
    await page.waitForTimeout(700);
    await ss(page, '10_overlays_modal');
    await page.keyboard.press('Escape');
  }

  // ── REPORTS ────────────────────────────────────────────────────────────────
  console.log('\n[11] Reports');
  await page.goto(`${BASE_URL}/reports`);
  await waitReady(page);
  await ss(page, '11_reports');

  // ── MODEL GOVERNANCE ───────────────────────────────────────────────────────
  console.log('\n[12] Model Governance');
  await page.goto(`${BASE_URL}/governance`);
  await waitReady(page);
  await ss(page, '12_governance');

  // ── AUDIT TRAIL ────────────────────────────────────────────────────────────
  console.log('\n[13] Audit Trail');
  await page.goto(`${BASE_URL}/audit`);
  await waitReady(page);
  await ss(page, '13_audit');

  // ── USER MANAGEMENT ────────────────────────────────────────────────────────
  console.log('\n[14] User Management');
  await page.goto(`${BASE_URL}/admin/users`);
  await waitReady(page);
  await ss(page, '14_user_management');

  // Try Add User modal
  const addUserBtn = page.locator('button').filter({ hasText: /add user|invite|new user/i }).first();
  if (await addUserBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await addUserBtn.click();
    await page.waitForTimeout(700);
    await ss(page, '14_user_management_add_modal');
    await page.keyboard.press('Escape');
  }

  // ── ROLE MANAGEMENT ────────────────────────────────────────────────────────
  console.log('\n[15] Role Management');
  await page.goto(`${BASE_URL}/admin/roles`);
  await waitReady(page);
  await ss(page, '15_role_management');

  // ── SIDEBAR COLLAPSED ──────────────────────────────────────────────────────
  console.log('\n[16] Sidebar collapsed');
  await page.goto(`${BASE_URL}/dashboard`);
  await waitReady(page);
  // Try clicking a sidebar toggle button
  const sidebarToggle = page.locator('button[aria-label*="sidebar"], button[aria-label*="menu"], button[aria-label*="collapse"]').first();
  if (await sidebarToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
    await sidebarToggle.click();
    await page.waitForTimeout(500);
    await ss(page, '16_dashboard_sidebar_collapsed');
    await sidebarToggle.click();
  } else {
    // Try the hamburger / first icon button in nav area
    const navBtn = page.locator('nav button, aside button').first();
    if (await navBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await navBtn.click();
      await page.waitForTimeout(500);
      await ss(page, '16_dashboard_sidebar_collapsed');
    }
  }

  await browser.close();

  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.png'));
  console.log(`\nDone — ${files.length} screenshots saved to: ${OUT_DIR}`);
  files.forEach(f => console.log('  ' + f));
}

main().catch(err => { console.error(err); process.exit(1); });
