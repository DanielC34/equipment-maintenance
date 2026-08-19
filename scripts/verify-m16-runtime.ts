import 'dotenv/config';
import { spawn, execSync, type ChildProcess } from 'node:child_process';

const HOST = '127.0.0.1';
const PORT = Number(process.env.VERIFY_PORT ?? 3200);
const PASSWORD = process.env.VERIFY_LIVE_PASSWORD ?? 'password123';
const ADMIN_EMAIL = process.env.VERIFY_LIVE_EMAIL ?? 'admin@emms.dev';

const skipBuild = process.argv.includes('--skip-build');

const baseUrl = (process.env.VERIFY_BASE_URL ?? `http://${HOST}:${PORT}`).replace(
  /\/+$/,
  ''
);
const isLive = Boolean(process.env.VERIFY_BASE_URL);

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

function getPage(
  cookieJar: Jar | null,
  target: string
): Promise<{ status: number; location: string | null; text: string }> {
  return fetch(`${baseUrl}${target}`, {
    redirect: 'manual',
    headers: cookieJar ? { cookie: cookieHeader(cookieJar) } : {},
  }).then(async (res) => ({
    status: res.status,
    location: res.headers.get('location'),
    text: await res.text(),
  }));
}

async function login(): Promise<{
  jar: Jar;
  sessionExpiryMs: number | null;
}> {
  const jar: Jar = {};
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`, { redirect: 'manual' });
  mergeCookies(jar, csrfRes.headers.getSetCookie());
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  const body = new URLSearchParams({
    csrfToken,
    email: ADMIN_EMAIL,
    password: PASSWORD,
    callbackUrl: `${baseUrl}/dashboard`,
    json: 'true',
  });
  const res = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: cookieHeader(jar),
      'x-auth-return-redirect': '1',
    },
    body,
  });

  let sessionExpiryMs: number | null = null;
  for (const cookie of res.headers.getSetCookie()) {
    if (!cookie.includes('session-token=')) continue;
    const expires = /Expires=([^;]+)/.exec(cookie)?.[1];
    if (expires) {
      sessionExpiryMs = Date.parse(expires);
    }
  }
  mergeCookies(jar, res.headers.getSetCookie());
  return { jar, sessionExpiryMs };
}

function startServer(): ChildProcess {
  return spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '-H', HOST, '-p', String(PORT)],
    { stdio: 'inherit', windowsHide: true, env: process.env }
  );
}

async function waitForServer(timeoutMs = 60000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/login`, { redirect: 'manual' });
      if (res.status === 200) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server at ${baseUrl} did not come up in time.`);
}

async function main(): Promise<void> {
  if (!isLive && !skipBuild) {
    console.log('Building the app...');
    execSync('npx next build', { stdio: 'inherit', env: process.env });
  }

  const server = isLive ? undefined : startServer();
  await waitForServer();

  try {
    console.log('A. Health endpoint');
    const health = await fetch(`${baseUrl}/api/health`);
    let healthBody: { status?: string; db?: string } = {};
    try {
      healthBody = (await health.json()) as { status?: string; db?: string };
    } catch {
      // non-JSON response recorded below
    }
    check(
      'GET /api/health returns 200',
      health.status === 200,
      `status=${health.status}`
    );
    check(
      'health reports ok',
      healthBody.status === 'ok',
      `body=${JSON.stringify(healthBody)}`
    );
    check(
      'health confirms database reachable',
      healthBody.db === 'ok',
      `db=${healthBody.db}`
    );

    console.log('B. Public pages (auth-aware root)');
    const landing = await getPage(null, '/');
    const landingRedirected =
      landing.status >= 300 &&
      landing.status < 400 &&
      Boolean(landing.location?.includes('/login'));
    check(
      'landing page redirects anonymous users to /login',
      landingRedirected,
      `status=${landing.status} location=${landing.location}`
    );
    const loginPage = await getPage(null, '/login');
    check(
      'login page renders',
      loginPage.status === 200,
      `status=${loginPage.status}`
    );

    console.log('C. Auth boundary');
    const anonDash = await getPage(null, '/dashboard');
    const redirected =
      anonDash.status >= 300 &&
      anonDash.status < 400 &&
      Boolean(anonDash.location?.includes('/login'));
    check(
      'anonymous /dashboard redirects to /login',
      redirected,
      `status=${anonDash.status} location=${anonDash.location}`
    );

    console.log('D. Sign-in and 24-hour session lifetime');
    if (!healthBody || healthBody.status !== 'ok') {
      check('skipped: /api/health is not ok, cannot proceed to auth', false);
    } else {
      const { jar, sessionExpiryMs } = await login();
      check('admin sign-in succeeds', Boolean(sessionExpiryMs), 'no session cookie');
      if (sessionExpiryMs) {
        const now = Date.now();
        const remainingH = (sessionExpiryMs - now) / 3_600_000;
        check(
          'session cookie expires ~24h after issue',
          remainingH >= 23 && remainingH <= 25,
          `remaining=${remainingH.toFixed(1)}h`
        );
      }
      const dash = await getPage(jar, '/dashboard');
      check(
        'authenticated /dashboard renders',
        dash.status === 200,
        `status=${dash.status}`
      );

      console.log('E. Custom not-found page (authenticated)');
      const missing = await getPage(jar, `/no-such-page-${Date.now()}`);
      check(
        'unknown route returns 404',
        missing.status === 404,
        `status=${missing.status}`
      );
      check(
        '404 renders the friendly not-found UI',
        missing.text.includes('Page not found'),
        `hasText=${missing.text.includes('Page not found')}`
      );
    }

    console.log('F. Health still healthy after a full request cycle');
    const health2 = await fetch(`${baseUrl}/api/health`);
    const health2Body = (await health2.json()) as { status?: string };
    check(
      'GET /api/health returns 200 after auth flow',
      health2.status === 200 && health2Body.status === 'ok',
      `status=${health2.status}`
    );
  } finally {
    if (server) {
      server.kill();
    }
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});