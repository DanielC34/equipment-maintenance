import { chromium } from './node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:3000';
const SS_DIR = join(__dirname, '..', 'screenshots');
const VIEWPORT = { width: 1440, height: 900 };
const CREDS = { email: 'admin@emms.dev', password: 'password123' };

// Second pass - only the routes that failed due to server crash
const ROUTES = [
  { file: '08-admin-users.png',           path: '/admin/users' },
  { file: '03b-equipment-detail.png',     path: '/equipment/cmt1i9ooz0007asv30l0xwt8r' },
  { file: '03c-equipment-create.png',     path: '/equipment/new' },
  { file: '04b-maintenance-detail.png',   path: '/maintenance/cmt1i9pkk000casv324tg7lyc' },
  { file: '04c-maintenance-create.png',   path: '/maintenance/new' },
  { file: '05b-downtime-detail.png',      path: '/downtime/cmt1i9ra9000kasv3fw5v5xyg' },
  { file: '05c-downtime-create.png',      path: '/downtime/new' },
];

const results = [];
const log = msg => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);

async function waitReady(page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

async function waitForServer(maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const resp = await fetch(BASE_URL);
      if (resp.ok || resp.status === 307 || resp.status === 302) {
        log('Server is up!');
        return true;
      }
    } catch {}
    log(`Waiting for server... attempt ${i + 1}/${maxAttempts}`);
    await new Promise(r => setTimeout(r, 3000));
  }
  return false;
}

async function doLogin(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitReady(page);
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
    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
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

async function main() {
  mkdirSync(SS_DIR, { recursive: true });
  
  log('Waiting for server to be ready...');
  const up = await waitForServer();
  if (!up) { log('Server never came up. Aborting.'); process.exit(1); }

  log('Launching Chromium...');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();

  const loggedIn = await doLogin(page);
  if (!loggedIn) { log('Login FAILED'); await browser.close(); process.exit(1); }
  log('Logged in successfully');

  for (const r of ROUTES) await capture(page, r);

  await browser.close();

  const ok = results.filter(r => r.status === 'OK');
  const fail = results.filter(r => r.status !== 'OK');
  console.log('\n=== SECOND PASS RESULTS ===');
  console.log(`OK: ${ok.length}  FAILED: ${fail.length}`);
  ok.forEach(r => console.log(`  OK  ${r.file}  ${r.dims?.w}x${r.dims?.h}`));
  fail.forEach(r => console.log(`  FAIL ${r.file}  ${r.status} ${r.error || ''}`));
}

main().catch(e => { console.error(e); process.exit(1); });
