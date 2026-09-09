import { chromium } from './node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:3000';
const SS_DIR = join(__dirname, '..', 'screenshots');
const VIEWPORT = { width: 1440, height: 900 };
const CREDS = { email: 'admin@emms.dev', password: 'password123' };

const ROUTES = [
  { file: '02-dashboard.png',      path: '/dashboard' },
  { file: '03-equipment.png',      path: '/equipment' },
  { file: '04-maintenance.png',    path: '/maintenance' },
  { file: '05-downtime.png',       path: '/downtime' },
  { file: '06-reports.png',        path: '/reports' },
  { file: '07-audit.png',          path: '/audit' },
  { file: '08-admin-users.png',    path: '/admin/users' },
];

const results = [];
const log = msg => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);

async function waitReady(page) {
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function doLogin(page) {
  log('Navigating to /login...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await waitReady(page);
  await page.screenshot({ path: join(SS_DIR, '01-login.png'), fullPage: true });
  log('Saved 01-login.png');

  await page.locator('input[type="email"], input[name="email"]').first().fill(CREDS.email);
  await page.locator('input[type="password"]').first().fill(CREDS.password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {}),
    page.locator('button[type="submit"]').click(),
  ]);
  await waitReady(page);
  const url = page.url();
  log(`Post-login URL: ${url}`);
  return !url.includes('/login');
}

async function capture(page, route) {
  log(`Capturing ${route.path}...`);
  try {
    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await waitReady(page);
    const url = page.url();
    if (url.includes('/login')) { results.push({ ...route, status: 'REDIRECT' }); log(`REDIRECT: ${route.path}`); return; }
    await page.screenshot({ path: join(SS_DIR, route.file), fullPage: true });
    const dims = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
    results.push({ ...route, status: 'OK', url, dims });
    log(`Saved ${route.file} (${dims.w}x${dims.h})`);
  } catch(e) {
    results.push({ ...route, status: 'ERROR', error: e.message });
    log(`ERROR: ${route.path}: ${e.message}`);
  }
}

async function discoverDetails(page) {
  const extras = [];
  try {
    await page.goto(`${BASE_URL}/equipment`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitReady(page);
    const href = await page.locator('a[href*="/equipment/"]:not([href="/equipment/new"])').first().getAttribute('href').catch(() => null);
    if (href) extras.push({ file: '03b-equipment-detail.png', path: href });
    extras.push({ file: '03c-equipment-create.png', path: '/equipment/new' });
  } catch {}
  try {
    await page.goto(`${BASE_URL}/maintenance`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitReady(page);
    const href = await page.locator('a[href*="/maintenance/"]:not([href="/maintenance/new"]):not([href*="/history"])').first().getAttribute('href').catch(() => null);
    if (href) extras.push({ file: '04b-maintenance-detail.png', path: href });
    extras.push({ file: '04c-maintenance-create.png', path: '/maintenance/new' });
  } catch {}
  try {
    await page.goto(`${BASE_URL}/downtime`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitReady(page);
    const href = await page.locator('a[href*="/downtime/"]:not([href="/downtime/new"])').first().getAttribute('href').catch(() => null);
    if (href) extras.push({ file: '05b-downtime-detail.png', path: href });
    extras.push({ file: '05c-downtime-create.png', path: '/downtime/new' });
  } catch {}
  return extras;
}

async function main() {
  mkdirSync(SS_DIR, { recursive: true });
  log('Launching Chromium...');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();

  const loggedIn = await doLogin(page);
  if (!loggedIn) { log('Login FAILED'); }
  else {
    log('Discovering detail pages...');
    const extras = await discoverDetails(page);
    const all = [...ROUTES, ...extras];
    for (const r of all) await capture(page, r);
  }

  await browser.close();

  const ok = results.filter(r => r.status === 'OK');
  const fail = results.filter(r => r.status !== 'OK');
  console.log('\n=== RESULTS ===');
  console.log(`OK: ${ok.length}  FAILED: ${fail.length}`);
  ok.forEach(r => console.log(`  OK  ${r.file}  ${r.dims?.w}x${r.dims?.h}`));
  fail.forEach(r => console.log(`  FAIL ${r.file}  ${r.status} ${r.error || ''}`));
  writeFileSync(join(SS_DIR, 'results.json'), JSON.stringify(results, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
