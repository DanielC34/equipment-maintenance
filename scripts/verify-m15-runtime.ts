import 'dotenv/config';
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import Redis from 'ioredis';
import prisma from '@/lib/prisma';
import {
  invalidateAggregateCaches,
  CACHE_KEYS,
} from '@/lib/cache';

const HOST = '127.0.0.1';
const PORT = Number(process.env.VERIFY_PORT ?? 3200);
const FALLBACK_PORT = PORT + 1;
const PASSWORD = 'password123';
const RUN = `m15run_${Date.now().toString(36)}`;

const skipBuild = process.argv.includes('--skip-build');

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, extra = ''): void {
  if (ok) {
    passed += 1;
    console.log(`  PASS ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${label}${extra ? ` | ${extra}` : ''}`);
  }
}

let manifest: { node: Record<string, { exportedName?: string }> };

function loadManifest(): void {
  manifest = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), '.next/server/server-reference-manifest.json'),
      'utf8'
    )
  );
}

function actionHash(exportedName: string): string {
  for (const [hash, value] of Object.entries(manifest.node)) {
    if (value.exportedName === exportedName) {
      return hash;
    }
  }
  throw new Error(`Server action not found in manifest: ${exportedName}`);
}

type Jar = Record<string, string>;

function mergeCookies(jar: Jar, setCookies: string[]): void {
  for (const cookie of setCookies) {
    const [pair] = cookie.split(';');
    const idx = pair.indexOf('=');
    jar[pair.slice(0, idx).trim()] = pair.slice(idx + 1);
  }
}

function cookieHeader(jar: Jar): string {
  return Object.entries(jar)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

function loginFor(
  port: number
): (email: string, password: string) => Promise<Jar> {
  const base = `http://${HOST}:${port}`;
  return async (email: string, password: string) => {
    const jar: Jar = {};
    const csrfRes = await fetch(`${base}/api/auth/csrf`, { redirect: 'manual' });
    mergeCookies(jar, csrfRes.headers.getSetCookie());
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

    const body = new URLSearchParams({
      csrfToken,
      email,
      password,
      callbackUrl: `${base}/dashboard`,
      json: 'true',
    });
    const res = await fetch(`${base}/api/auth/callback/credentials`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie: cookieHeader(jar),
        'x-auth-return-redirect': '1',
      },
      body,
    });
    mergeCookies(jar, res.headers.getSetCookie());
    return jar;
  };
}

function getPageFor(
  port: number
): (
  cookieJar: Jar | null,
  target: string
) => Promise<{ status: number; text: string }> {
  const base = `http://${HOST}:${port}`;
  return async (cookieJar: Jar | null, target: string) => {
    const res = await fetch(`${base}${target}`, {
      redirect: 'manual',
      headers: cookieJar ? { cookie: cookieHeader(cookieJar) } : {},
    });
    return { status: res.status, text: await res.text() };
  };
}

function dispatchFor(
  port: number
): (
  cookieJar: Jar,
  exportName: string,
  args: unknown[],
  target?: string
) => Promise<{ status: number; redirectTo: string | null; text: string }> {
  const base = `http://${HOST}:${port}`;
  return async (cookieJar, exportName, args, target = '/dashboard') => {
    const res = await fetch(`${base}${target}`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'content-type': 'text/plain;charset=UTF-8',
        'next-action': actionHash(exportName),
        cookie: cookieHeader(cookieJar),
        accept: 'text/x-component',
      },
      body: JSON.stringify(args),
    });
    const xr = res.headers.get('x-action-redirect');
    return {
      status: res.status,
      redirectTo: xr ? xr.split(';')[0] : null,
      text: (await res.text()).slice(0, 16000),
    };
  };
}

const trackedDowntime: string[] = [];

async function cleanup(redis: Redis): Promise<void> {
  await invalidateAggregateCaches();
  await prisma.auditLog.deleteMany({
    where: { entityId: { in: trackedDowntime } },
  });
  const deleted = await prisma.downtimeEvent.deleteMany({
    where: { id: { in: trackedDowntime } },
  });
  await redis.quit();
  console.log(`  cleanup: ${deleted.count} downtime rows removed`);
}

function startServer(
  port: number,
  env?: Record<string, string>
): ChildProcess {
  return spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '-H', HOST, '-p', String(port)],
    { stdio: 'inherit', windowsHide: true, env: { ...process.env, ...env } }
  );
}

async function waitForServer(
  port: number,
  timeoutMs = 60000
): Promise<void> {
  const base = `http://${HOST}:${port}`;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${base}/login`, { redirect: 'manual' });
      if (res.status === 200) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server on :${port} did not come up in time.`);
}

async function main(): Promise<void> {
  if (!skipBuild) {
    console.log('Building the app...');
    execSync('npx next build', { stdio: 'inherit', env: process.env });
  }

  loadManifest();

  const redis = new Redis(process.env.REDIS_URL!);

  const server = startServer(PORT);
  await waitForServer(PORT);
  console.log(`Server ready at http://${HOST}:${PORT}`);

  try {
    const login = loginFor(PORT);
    const getPage = getPageFor(PORT);
    const dispatchAction = dispatchFor(PORT);
    const admin = await login('admin@emms.dev', PASSWORD);
    const operator = await login('operator@emms.dev', PASSWORD);

    await invalidateAggregateCaches();

    console.log('A. Dashboard renders and populates the aggregate cache');
    const dash1 = await getPage(admin, '/dashboard');
    check(
      'dashboard renders for admin',
      dash1.status === 200,
      `status=${dash1.status}`
    );
    const ttlDash = await redis.ttl(CACHE_KEYS.dashboardAggregates);
    check(
      'dashboard aggregates cached with TTL > 0',
      ttlDash > 0 && ttlDash <= 60,
      `ttl=${ttlDash}s`
    );

    console.log('B. Reports render and populate both report caches');
    const reportsPage = await getPage(admin, '/reports');
    check(
      'reports page renders',
      reportsPage.status === 200,
      `status=${reportsPage.status}`
    );
    const ttlMaint = await redis.ttl(CACHE_KEYS.reportsMaintenance);
    const ttlDown = await redis.ttl(CACHE_KEYS.reportsDowntime);
    check(
      'maintenance report cached',
      ttlMaint > 0 && ttlMaint <= 60,
      `ttl=${ttlMaint}s`
    );
    check(
      'downtime report cached',
      ttlDown > 0 && ttlDown <= 60,
      `ttl=${ttlDown}s`
    );

    console.log('C. Second dashboard load still served (cache present)');
    const dash2 = await getPage(admin, '/dashboard');
    check(
      'dashboard renders again',
      dash2.status === 200,
      `status=${dash2.status}`
    );
    check(
      'aggregate key still present after second render',
      (await redis.exists(CACHE_KEYS.dashboardAggregates)) === 1
    );

    console.log('D. A mutating action invalidates the aggregate caches');
    const equipment = await prisma.equipment.findFirst({
      where: { deletedAt: null },
    });
    check('an active equipment exists for the probe', equipment !== null);
    if (equipment) {
      const record = await dispatchAction(
        operator,
        'recordDowntimeEvent',
        [
          {
            equipmentId: equipment.id,
            startedAt: new Date(Date.now() - 3_600_000).toISOString(),
            endedAt: '',
            reason: 'ELECTRICAL',
            notes: `${RUN} runtime probe`,
          },
        ],
        '/downtime/new'
      );
      check(
        'recordDowntimeEvent succeeds',
        record.redirectTo !== null,
        `xr=${record.redirectTo}`
      );
      if (record.redirectTo) {
        trackedDowntime.push(record.redirectTo.split('/').pop()!);
      }

      const dashAfter = await redis.exists(CACHE_KEYS.dashboardAggregates);
      const maintAfter = await redis.exists(CACHE_KEYS.reportsMaintenance);
      const downAfter = await redis.exists(CACHE_KEYS.reportsDowntime);
      check(
        'all aggregate keys invalidated by the mutation',
        dashAfter === 0 && maintAfter === 0 && downAfter === 0,
        `dash=${dashAfter} maint=${maintAfter} down=${downAfter}`
      );

      const reportsAfter = await getPage(admin, '/reports');
      check(
        'reports re-render and re-cache after invalidation',
        reportsAfter.status === 200 &&
          (await redis.exists(CACHE_KEYS.reportsDowntime)) === 1,
        `status=${reportsAfter.status}`
      );
    }

    console.log(
      `E. Graceful fallback on a server with Redis unreachable (:${FALLBACK_PORT})`
    );
    const fallbackServer = startServer(FALLBACK_PORT, {
      REDIS_URL: 'redis://127.0.0.1:6399',
    });
    await waitForServer(FALLBACK_PORT);
    const loginFb = loginFor(FALLBACK_PORT);
    const getPageFb = getPageFor(FALLBACK_PORT);
    const adminFb = await loginFb('admin@emms.dev', PASSWORD);
    const fbDash = await getPageFb(adminFb, '/dashboard');
    const fbReports = await getPageFb(adminFb, '/reports');
    check(
      'dashboard renders with Redis down',
      fbDash.status === 200,
      `status=${fbDash.status}`
    );
    check(
      'reports render with Redis down',
      fbReports.status === 200,
      `status=${fbReports.status}`
    );
    await getPageFb(adminFb, '/dashboard');
    check(
      'fallback server stays responsive after repeat load',
      (await fetch(`http://${HOST}:${FALLBACK_PORT}/login`)).status === 200
    );
    fallbackServer.kill();
  } finally {
    await cleanup(redis);
    server.kill();
    await prisma.$disconnect();
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});