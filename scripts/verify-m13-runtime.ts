import 'dotenv/config';
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { PERMISSIONS, roleHasPermission } from '@/lib/permissions';
import type { Role } from '@prisma/client';

const HOST = '127.0.0.1';
const PORT = Number(process.env.VERIFY_PORT ?? 3200);
const BASE = `http://${HOST}:${PORT}`;
const PASSWORD = 'password123';
const RUN = `m13run_${Date.now().toString(36)}`;

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

async function login(email: string, password: string): Promise<Jar> {
  const jar: Jar = {};
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { redirect: 'manual' });
  mergeCookies(jar, csrfRes.headers.getSetCookie());
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: `${BASE}/dashboard`,
    json: 'true',
  });
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
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
}

async function getPage(
  cookieJar: Jar | null,
  target: string
): Promise<{ status: number; location: string | null; text: string }> {
  const res = await fetch(`${BASE}${target}`, {
    redirect: 'manual',
    headers: cookieJar ? { cookie: cookieHeader(cookieJar) } : {},
  });
  return {
    status: res.status,
    location: res.headers.get('location'),
    text: await res.text(),
  };
}

async function dispatchAction(
  cookieJar: Jar,
  exportName: string,
  args: unknown[],
  target = '/dashboard'
): Promise<{ status: number; redirectTo: string | null; text: string }> {
  const res = await fetch(`${BASE}${target}`, {
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
    text: (await res.text()).slice(0, 4000),
  };
}

async function expectRedirect(
  label: string,
  jar: Jar | null,
  target: string,
  to: string
): Promise<void> {
  const page = await getPage(jar, target);
  check(
    label,
    page.status === 307 &&
      page.location?.split('?')[0] === to,
    `status=${page.status} location=${page.location}`
  );
}

async function expectPage(
  label: string,
  jar: Jar | null,
  target: string,
  marker?: string
): Promise<void> {
  const page = await getPage(jar, target);
  const hasContent = marker
    ? page.text.includes(marker)
    : page.text.length > 500;
  check(
    label,
    page.status === 200 && hasContent,
    `status=${page.status} bytes=${page.text.length}`
  );
}

async function expectDenied(label: string, jar: Jar, target: string): Promise<void> {
  const page = await getPage(jar, target);
  const hardRedirect = page.status === 307 && page.location === '/unauthorized';
  const streamedRedirect =
    page.status === 200 && page.text.includes('url=/unauthorized');
  check(
    label,
    hardRedirect || streamedRedirect,
    `status=${page.status} location=${page.location} refresh=${page.text.includes('url=/unauthorized')}`
  );
}

const ROLE_BY_EMAIL: Record<string, Role> = {
  'admin@emms.dev': 'ADMINISTRATOR',
  'supervisor@emms.dev': 'SUPERVISOR',
  'technician@emms.dev': 'TECHNICIAN',
  'operator@emms.dev': 'OPERATOR',
  'manager@emms.dev': 'PLANT_MANAGER',
  'reliability@emms.dev': 'RELIABILITY_ENGINEER',
};

const SEED_ROLES: { email: string; role: Role }[] = Object.entries(
  ROLE_BY_EMAIL
).map(([email, role]) => ({ email, role }));

const STATIC_PAGES: {
  path: string;
  perm: keyof typeof PERMISSIONS;
  marker?: string;
}[] = [
  { path: '/dashboard', perm: 'appView', marker: 'Dashboard' },
  { path: '/equipment', perm: 'equipmentView', marker: 'Equipment' },
  { path: '/equipment/new', perm: 'equipmentCreate' },
  { path: '/maintenance', perm: 'maintenanceView', marker: 'Maintenance' },
  { path: '/maintenance/new', perm: 'maintenanceSchedule' },
  { path: '/maintenance/history', perm: 'maintenanceView', marker: 'Maintenance history' },
  { path: '/downtime', perm: 'appView', marker: 'Downtime' },
  { path: '/downtime/new', perm: 'downtimeRecord' },
  { path: '/reports', perm: 'reportsView', marker: 'Reports' },
  { path: '/audit', perm: 'auditView', marker: 'Audit Log' },
];

function checkPageMatrix(jar: Jar, role: Role): void {
  for (const page of STATIC_PAGES) {
    if (roleHasPermission(role, PERMISSIONS[page.perm])) {
      expectPage(`${role} ${page.path}`, jar, page.path, page.marker);
    } else {
      expectDenied(`${role} ${page.path} (denied)`, jar, page.path);
    }
  }
  if (role === 'ADMINISTRATOR') {
    expectRedirect('ADMINISTRATOR /admin -> /admin/users', jar, '/admin', '/admin/users');
  } else {
    expectDenied(`${role} /admin (denied)`, jar, '/admin');
    expectDenied(`${role} /admin/users (denied)`, jar, '/admin/users');
  }
}

const trackedUsers: string[] = [];

async function cleanup(): Promise<void> {
  await prisma.auditLog.deleteMany({
    where: {
      OR: [{ entityLabel: { contains: RUN } }, { actorId: { in: trackedUsers } }],
    },
  });
  await prisma.user.deleteMany({ where: { id: { in: trackedUsers } } });
  console.log(`  cleanup: ${trackedUsers.length} users`);
}

function startServer(): ChildProcess {
  return spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '-H', HOST, '-p', String(PORT)],
    { stdio: 'inherit', windowsHide: true }
  );
}

async function waitForServer(timeoutMs = 60000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/login`, { redirect: 'manual' });
      if (res.status === 200) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Server did not come up in time.');
}

async function main(): Promise<void> {
  if (!skipBuild) {
    console.log('Building the app...');
    execSync('npx next build', { stdio: 'inherit', env: process.env });
  }

  loadManifest();

  const server = startServer();
  await waitForServer();
  console.log(`Server ready at ${BASE}`);

  try {
    const jars: Record<string, Jar> = {};
    for (const { email } of SEED_ROLES) {
      jars[email] = await login(email, PASSWORD);
    }
    const admin = jars['admin@emms.dev'];

    console.log('A. Authz boundaries for user administration');
    await expectRedirect('anon /admin -> /login', null, '/admin', '/login');
    await expectRedirect('anon /admin/users -> /login', null, '/admin/users', '/login');
    await expectPage('admin /admin/users renders', admin, '/admin/users', 'Add user');
    await expectRedirect('admin /admin -> /admin/users', admin, '/admin', '/admin/users');
    await expectDenied('supervisor /admin/users denied', jars['supervisor@emms.dev'], '/admin/users');
    await expectDenied('technician /admin/users denied', jars['technician@emms.dev'], '/admin/users');
    await expectDenied('operator /admin/users denied', jars['operator@emms.dev'], '/admin/users');
    await expectDenied('manager /admin/users denied', jars['manager@emms.dev'], '/admin/users');
    await expectDenied('reliability /admin/users denied', jars['reliability@emms.dev'], '/admin/users');
    await expectDenied('supervisor /admin/users/new denied', jars['supervisor@emms.dev'], '/admin/users/new');

    console.log('B. Role / page matrix');
    for (const { email, role } of SEED_ROLES) {
      checkPageMatrix(jars[email], role);
    }

    console.log('C. Create user via server action');
    const createdValues = {
      name: `${RUN} Tech`,
      email: `${RUN}tech@emms.dev`,
      role: 'TECHNICIAN',
      password: 'runtime-password-123',
    };
    const seedAdmin = await prisma.user.findUnique({
      where: { email: 'admin@emms.dev' },
      select: { id: true },
    });
    const created = await dispatchAction(
      admin,
      'createUser',
      [createdValues],
      '/admin/users/new'
    );
    const createdId = created.redirectTo?.split('/').pop();
    check('createUser redirects to /admin/users/[id]', !!createdId, `xr=${created.redirectTo}`);
    if (createdId) {
      trackedUsers.push(createdId);
      const row = await prisma.user.findUnique({ where: { id: createdId } });
      const hashOk = row ? await bcrypt.compare(createdValues.password, row.password!) : false;
      check(
        'created user hashed password matches input',
        !!row && hashOk,
        JSON.stringify({ active: row?.active })
      );
      check(
        'created user is active and normalized email matches',
        !!row && row.active === true && row.email === createdValues.email,
        JSON.stringify(row)
      );
      const audits = await prisma.auditLog.findMany({
        where: { entityType: 'USER', entityId: createdId },
        orderBy: { createdAt: 'asc' },
      });
      check(
        'CREATE/USER audit row written with session actor',
        audits.length === 1 &&
          audits[0].action === 'CREATE' &&
          audits[0].actorId === seedAdmin?.id &&
          audits[0].entityLabel === `${RUN} Tech`,
        JSON.stringify(audits.map((a) => a.action))
      );

      const detail = await getPage(admin, `/admin/users/${createdId}`);
      check(
        'user detail page renders',
        detail.status === 200 &&
          detail.text.includes(`${RUN} Tech`) &&
          detail.text.includes(createdValues.email),
        `status=${detail.status}`
      );

      const upsert = await getPage(admin, `/admin/users/${createdId}/edit`);
      check(
        'user edit page renders',
        upsert.status === 200 && upsert.text.includes(`Edit ${RUN} Tech`),
        `status=${upsert.status}`
      );

      check(
        'mixed-case email still normalized on create',
        await (async () => {
          const mixed = await dispatchAction(
            admin,
            'createUser',
            [
              {
                name: `${RUN} Mixed`,
                email: `  MIXED${RUN}@EMMS.dev  `,
                role: 'OPERATOR',
                password: 'runtime-password-123',
              },
            ],
            '/admin/users/new'
          );
          const mixedId = mixed.redirectTo?.split('/').pop();
          if (!mixedId) return false;
          trackedUsers.push(mixedId);
          const row = await prisma.user.findUnique({ where: { id: mixedId } });
          return row?.email === `mixed${RUN}@emms.dev`;
        })(),
        'normalization'
      );

      const dup = await dispatchAction(
        admin,
        'createUser',
        [createdValues],
        '/admin/users/new'
      );
      check(
        'duplicate email rejected with no extra audit row',
        dup.text.includes('already exists') &&
          (await prisma.auditLog.count({
            where: { entityType: 'USER', entityId: createdId },
          })) === 1,
        dup.text.slice(0, 140)
      );

      const invalid = await dispatchAction(
        admin,
        'createUser',
        [
          {
            name: '',
            email: 'not-an-email',
            role: 'TECHNICIAN',
            password: 'short',
          },
        ],
        '/admin/users/new'
      );
      check(
        'invalid create rejected client-side',
        invalid.text.includes('User name is required.') &&
          invalid.text.includes('Enter a valid email address.') &&
          invalid.text.includes('Password must be at least 8 characters.'),
        invalid.text.slice(0, 220)
      );

      check(
        'failed validation stored no user row',
        (await prisma.user.count({ where: { email: 'not-an-email' } })) === 0,
        'count'
      );

      console.log('D. Update user: role, status, guard rails, and assignment');
      await dispatchAction(
        admin,
        'updateUser',
        [createdId, { role: 'SUPERVISOR', active: true }],
        `/admin/users/${createdId}/edit`
      );
      const roleRow = await prisma.user.findUnique({ where: { id: createdId } });
      check('stored role changed to SUPERVISOR', roleRow?.role === 'SUPERVISOR', `role=${roleRow?.role}`);
      const roleAudits = await prisma.auditLog.findMany({
        where: { entityType: 'USER', entityId: createdId },
        orderBy: { createdAt: 'asc' },
      });
      check(
        'UPDATE/USER audit row appended',
        roleAudits.map((a) => a.action).slice(-1)[0] === 'UPDATE',
        JSON.stringify(roleAudits.map((a) => a.action))
      );

      const deactivate = await dispatchAction(
        admin,
        'updateUser',
        [createdId, { role: 'SUPERVISOR', active: false }],
        `/admin/users/${createdId}/edit`
      );
      const deactivated = await prisma.user.findUnique({ where: { id: createdId } });
      check('updateUser deactivates the account', deactivated?.active === false, deactivate.text.slice(0, 140));

      const newTaskPage = await getPage(jars['supervisor@emms.dev'], '/maintenance/new');
      check(
        'deactivated user hidden from the assignment list',
        !newTaskPage.text.includes(`${RUN} Tech`),
        `contains=${newTaskPage.text.includes(`${RUN} Tech`)}`
      );

      const equipment = await prisma.equipment.findFirst({
        where: { status: { not: 'OFFLINE' } },
      });
      const badAssign = await dispatchAction(
        jars['supervisor@emms.dev'],
        'createMaintenanceTask',
        [
          {
            title: `${RUN} task`,
            description: 'runtime probe',
            equipmentId: equipment!.id,
            assignedUserId: createdId,
            scheduledDate: new Date(Date.now() + 86400000).toISOString(),
            priority: 'MEDIUM',
          },
        ],
        '/maintenance/new'
      );
      const tasksToCreated = await prisma.maintenanceTask.count({
        where: { assignedUserId: createdId },
      });
      check(
        'assigning an inactive user is rejected',
        badAssign.text.includes('cannot be assigned maintenance work') && tasksToCreated === 0,
        badAssign.text.slice(0, 140)
      );

      const reactivate = await dispatchAction(
        admin,
        'updateUser',
        [createdId, { role: 'TECHNICIAN', active: true }],
        `/admin/users/${createdId}/edit`
      );
      const restored = await prisma.user.findUnique({ where: { id: createdId } });
      check('reactivated user restored', restored?.active === true && restored?.role === 'TECHNICIAN', reactivate.text.slice(0, 140));

      const newTaskPageAfter = await getPage(jars['supervisor@emms.dev'], '/maintenance/new');
      check(
        'reactivated user visible in the assignment list',
        newTaskPageAfter.text.includes(`${RUN} Tech`),
        `contains=${newTaskPageAfter.text.includes(`${RUN} Tech`)}`
      );

      const selfDeactivate = await dispatchAction(
        admin,
        'updateUser',
        [seedAdmin!.id, { role: 'ADMINISTRATOR', active: false }],
        `/admin/users/${seedAdmin!.id}/edit`
      );
      check(
        'self-deactivation blocked',
        selfDeactivate.text.includes('You cannot deactivate your own account.'),
        selfDeactivate.text.slice(0, 140)
      );
      const selfDemote = await dispatchAction(
        admin,
        'updateUser',
        [seedAdmin!.id, { role: 'OPERATOR', active: true }],
        `/admin/users/${seedAdmin!.id}/edit`
      );
      check(
        'self role removal blocked',
        selfDemote.text.includes('You cannot remove your own administrator role.'),
        selfDemote.text.slice(0, 140)
      );
      const seedStill = await prisma.user.findUnique({ where: { id: seedAdmin!.id } });
      check(
        'seed admin unchanged after denied self-actions',
        seedStill?.role === 'ADMINISTRATOR' && seedStill?.active === true,
        JSON.stringify(seedStill)
      );

      console.log('E. Login gating for deactivated accounts');
      const jarTech = await login(createdValues.email, createdValues.password);
      await expectPage('active user logs in to dashboard', jarTech, '/dashboard', 'Dashboard');
      await dispatchAction(
        admin,
        'updateUser',
        [createdId, { role: 'TECHNICIAN', active: false }],
        `/admin/users/${createdId}/edit`
      );
      const jarTechAfter = await login(createdValues.email, createdValues.password);
      await expectRedirect('deactivated user cannot sign in', jarTechAfter, '/dashboard', '/login');
      await dispatchAction(
        admin,
        'updateUser',
        [createdId, { role: 'TECHNICIAN', active: true }],
        `/admin/users/${createdId}/edit`
      );
      const jarTechRestored = await login(createdValues.email, createdValues.password);
      await expectPage('reactivated user signs in again', jarTechRestored, '/dashboard', 'Dashboard');

      console.log('F. User list UI: search, filters, detail, empty state');
      await expectPage('list page search finds user', admin, `/admin/users?q=${RUN}`, 'Add user');
      const filtered = await getPage(admin, '/admin/users?role=TECHNICIAN');
      check('list filtered by role', filtered.status === 200, `status=${filtered.status}`);
      const inactive = await getPage(admin, '/admin/users?active=false');
      check('list filtered by status', inactive.status === 200, `status=${inactive.status}`);
      const none = await getPage(admin, `/admin/users?q=zzznomatch_${RUN}`);
      check(
        'no-match empty state shown',
        none.status === 200 && none.text.includes('No users match your filters'),
        `status=${none.status}`
      );
      await expectPage('new user page renders', admin, '/admin/users/new', 'Create a new account');
    }

    console.log('G. Regression sweep (admin)');
    for (const page of STATIC_PAGES) {
      const res = await getPage(admin, page.path);
      check(`sweep ${page.path}`, res.status === 200, `status=${res.status}`);
    }
    const adminBoard = await getPage(admin, '/admin/users');
    check('sweep /admin/users', adminBoard.status === 200, `status=${adminBoard.status}`);
  } finally {
    await cleanup();
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