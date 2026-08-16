import 'dotenv/config';
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import prisma from '@/lib/prisma';
import { PERMISSIONS, roleHasPermission } from '@/lib/permissions';
import type { Role } from '@prisma/client';

const HOST = '127.0.0.1';
const PORT = Number(process.env.VERIFY_PORT ?? 3100);
const BASE = `http://${HOST}:${PORT}`;
const PASSWORD = 'password123';
const RUN = `m11run_${Date.now().toString(36)}`;

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

async function expectRedirect(label: string, jar: Jar | null, target: string, to: string) {
  const page = await getPage(jar, target);
  check(label, page.status === 307 && page.location?.split('?')[0] === to, `status=${page.status} location=${page.location}`);
}

async function expectPage(label: string, jar: Jar | null, target: string, marker?: string) {
  const page = await getPage(jar, target);
  const hasContent = marker ? page.text.includes(marker) : page.text.length > 500;
  check(label, page.status === 200 && hasContent, `status=${page.status} bytes=${page.text.length}`);
}

async function expectDenied(label: string, jar: Jar, target: string) {
  const page = await getPage(jar, target);
  const hardRedirect = page.status === 307 && page.location === '/unauthorized';
  const streamedRedirect =
    page.status === 200 && page.text.includes('url=/unauthorized');
  check(label, hardRedirect || streamedRedirect, `status=${page.status} location=${page.location} refresh=${page.text.includes('url=/unauthorized')}`);
}

const ROLE_BY_EMAIL: Record<string, Role> = {
  'admin@emms.dev': 'ADMINISTRATOR',
  'supervisor@emms.dev': 'SUPERVISOR',
  'technician@emms.dev': 'TECHNICIAN',
  'operator@emms.dev': 'OPERATOR',
  'manager@emms.dev': 'PLANT_MANAGER',
  'reliability@emms.dev': 'RELIABILITY_ENGINEER',
};

const SEED_ROLES: { email: string; role: Role }[] = Object.entries(ROLE_BY_EMAIL).map(
  ([email, role]) => ({ email, role })
);

const STATIC_PAGES: { path: string; perm: keyof typeof PERMISSIONS; marker?: string }[] = [
  { path: '/dashboard', perm: 'appView', marker: 'Dashboard' },
  { path: '/equipment', perm: 'equipmentView', marker: 'Equipment' },
  { path: '/equipment/new', perm: 'equipmentCreate' },
  { path: '/maintenance', perm: 'maintenanceView', marker: 'Maintenance' },
  { path: '/maintenance/new', perm: 'maintenanceSchedule' },
  { path: '/maintenance/history', perm: 'maintenanceView', marker: 'Maintenance history' },
  { path: '/downtime', perm: 'appView', marker: 'Downtime' },
  { path: '/downtime/new', perm: 'downtimeRecord' },
  { path: '/reports', perm: 'reportsView', marker: 'Reports' },
  { path: '/admin', perm: 'usersManage' },
];

function checkPageMatrix(jar: Jar, role: Role): void {
  for (const page of STATIC_PAGES) {
    if (roleHasPermission(role, PERMISSIONS[page.perm])) {
      expectPage(`${role} ${page.path}`, jar, page.path, page.marker);
    } else {
      expectDenied(`${role} ${page.path} (denied)`, jar, page.path);
    }
  }
}

const tracked = {
  equipment: [] as string[],
  tasks: [] as string[],
  records: [] as string[],
  downtime: [] as string[],
};

async function cleanup(): Promise<void> {
  await prisma.downtimeEvent.deleteMany({ where: { id: { in: tracked.downtime } } });
  await prisma.partUsed.deleteMany({ where: { maintenanceRecordId: { in: tracked.records } } });
  await prisma.maintenanceRecord.deleteMany({ where: { id: { in: tracked.records } } });
  await prisma.maintenanceTask.deleteMany({ where: { id: { in: tracked.tasks } } });
  await prisma.equipment.deleteMany({ where: { id: { in: tracked.equipment } } });
  console.log(`  cleanup: ${tracked.equipment.length} equipment, ${tracked.tasks.length} tasks, ${tracked.records.length} records, ${tracked.downtime.length} downtime`);
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

    console.log('A. Authentication and proxy boundaries');
    await expectRedirect('anon /dashboard -> /login', null, '/dashboard', '/login');
    await expectRedirect('anon /reports -> /login', null, '/reports', '/login');
    await expectPage('anon /login renders', null, '/login', 'Sign in');
    {
      const bad = await login('admin@emms.dev', 'wrong-password');
      await expectRedirect('failed login has no session', bad, '/dashboard', '/login');
    }
    await expectRedirect('admin /login bounces to /dashboard', admin, '/login', '/dashboard');

    console.log('B. Role / page matrix');
    for (const { email, role } of SEED_ROLES) {
      checkPageMatrix(jars[email], role);
    }

    console.log('C. Equipment actions');
    {
      const factories = await prisma.factory.findMany({ take: 1 });
      const factoryId = factories[0].id;
      const operator = jars['operator@emms.dev'];

      const values = (assetNumber: string) => ({
        name: `${RUN} CNC`,
        assetNumber,
        description: '  probe  ',
        location: 'Probe Bay',
        status: 'OPERATIONAL',
        criticality: '',
        factoryId,
      });

      const created = await dispatchAction(admin, 'createEquipment', [values(`${RUN}_asset1`)], '/equipment/new');
      const eqId = created.redirectTo?.split('/').pop();
      check('createEquipment redirects', !!eqId, `xr=${created.redirectTo}`);
      if (eqId) {
        tracked.equipment.push(eqId);
        const row = await prisma.equipment.findUnique({ where: { id: eqId } });
        check('createEquipment persisted with trimmed fields', row?.name === `${RUN} CNC` && row.description === 'probe' && row.criticality === null, JSON.stringify(row));
        const detail = await getPage(admin, `/equipment/${eqId}`);
        check('equipment detail renders', detail.status === 200 && detail.text.includes('CNC'));
      }

      const dup = await dispatchAction(admin, 'createEquipment', [values(`${RUN}_asset1`)], '/equipment/new');
      check('duplicate asset number rejected', dup.text.includes('already exists'), dup.text.slice(0, 140));

      const invalid = await dispatchAction(admin, 'createEquipment', [{ ...values(`${RUN}_bad`), name: '' }], '/equipment/new');
      check('invalid equipment returns field errors', invalid.text.includes('Equipment name is required.'), invalid.text.slice(0, 140));

      if (eqId) {
        const updated = await dispatchAction(admin, 'updateEquipment', [
          eqId,
          { ...values(`${RUN}_asset1`), name: `${RUN} CNC v2`, location: 'Probe Bay 2', status: 'UNDER_MAINTENANCE', description: '', criticality: 'High' },
        ], `/equipment/${eqId}/edit`);
        const row = await prisma.equipment.findUnique({ where: { id: eqId } });
        check('updateEquipment persisted', row?.status === 'UNDER_MAINTENANCE' && row?.location === 'Probe Bay 2' && row?.name === `${RUN} CNC v2`, `status=${row?.status} loc=${row?.location}`);
        check('updateEquipment redirects', !!updated.redirectTo, `xr=${updated.redirectTo}`);
      }

      const ghost = await dispatchAction(admin, 'updateEquipment', [
        'ghost-id', { ...values(`${RUN}_ghost`), name: 'x', location: 'x' },
      ], '/equipment/ghost-id/edit');
      check('updateEquipment reports missing', ghost.text.includes('no longer exists'), ghost.text.slice(0, 140));

      await dispatchAction(operator, 'createEquipment', [values(`${RUN}_denied`)], '/equipment/new');
      const deniedRow = await prisma.equipment.findUnique({ where: { assetNumber: `${RUN}_denied` } });
      check('operator cannot create equipment (no row)', deniedRow === null, JSON.stringify(deniedRow));
    }

    console.log('D. Maintenance lifecycle');
    {
      const techUser = await prisma.user.findUnique({ where: { email: 'technician@emms.dev' } });
      const opUser = await prisma.user.findUnique({ where: { email: 'operator@emms.dev' } });
      const equipment = await prisma.equipment.findFirst({ where: { status: { not: 'OFFLINE' } } });

      const mkTask = (title: string, assignedUserId: string) => ({
        title,
        description: 'runtime probe',
        equipmentId: equipment!.id,
        assignedUserId,
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        priority: 'MEDIUM',
      });

      const created = await dispatchAction(jars['supervisor@emms.dev'], 'createMaintenanceTask', [mkTask(`${RUN} task`, techUser!.id)], '/maintenance/new');
      const taskId = created.redirectTo?.split('/').pop();
      check('createMaintenanceTask redirects (SCHEDULED)', !!taskId, `xr=${created.redirectTo}`);
      if (taskId) {
        tracked.tasks.push(taskId);
        const task = await prisma.maintenanceTask.findUnique({ where: { id: taskId } });
        check('task persisted SCHEDULED to technician', task?.status === 'SCHEDULED' && task.assignedUserId === techUser!.id, `status=${task?.status}`);

        const detail = await getPage(jars['technician@emms.dev'], `/maintenance/${taskId}`);
        check('maintenance detail renders', detail.status === 200 && detail.text.includes(RUN));

        const wrongUser = await dispatchAction(jars['supervisor@emms.dev'], 'startMaintenanceTask', [taskId], `/maintenance/${taskId}`);
        const stillScheduled = await prisma.maintenanceTask.findUnique({ where: { id: taskId } });
        check('non-assigned user cannot start', stillScheduled?.status === 'SCHEDULED' && wrongUser.text.includes('Only the technician assigned'), `status=${stillScheduled?.status}`);

        await dispatchAction(jars['technician@emms.dev'], 'startMaintenanceTask', [taskId], `/maintenance/${taskId}`);
        const afterStart = await prisma.maintenanceTask.findUnique({ where: { id: taskId } });
        check('startMaintenanceTask sets IN_PROGRESS', afterStart?.status === 'IN_PROGRESS', `status=${afterStart?.status}`);

        await dispatchAction(jars['technician@emms.dev'], 'completeMaintenanceTask', [taskId, { description: `${RUN} work`, notes: '', parts: [{ name: 'Filter', quantity: 2 }] }], `/maintenance/${taskId}`);
        const record = await prisma.maintenanceRecord.findUnique({ where: { taskId } });
        check('completion created a linked record', record !== null && record.technicianId === techUser!.id, 'no record');
        if (record) {
          tracked.records.push(record.id);
          const parts = await prisma.partUsed.findMany({ where: { maintenanceRecordId: record.id } });
          check('completion created parts', parts.some((p) => p.name === 'Filter' && p.quantity === 2), JSON.stringify(parts));
        }
        const afterComplete = await prisma.maintenanceTask.findUnique({ where: { id: taskId } });
        check('completion set task COMPLETED', afterComplete?.status === 'COMPLETED', `status=${afterComplete?.status}`);

        const second = await dispatchAction(jars['technician@emms.dev'], 'completeMaintenanceTask', [taskId, { description: 'x', notes: '', parts: [] }], `/maintenance/${taskId}`);
        check('double completion rejected', second.text.includes('already been completed'), second.text.slice(0, 140));
      }

      const notStartedTask = await dispatchAction(jars['supervisor@emms.dev'], 'createMaintenanceTask', [mkTask(`${RUN} notstart`, techUser!.id)], '/maintenance/new');
      const notStartedId = notStartedTask.redirectTo?.split('/').pop();
      if (notStartedId) {
        tracked.tasks.push(notStartedId);
        const early = await dispatchAction(jars['technician@emms.dev'], 'completeMaintenanceTask', [notStartedId, { description: 'x', notes: '', parts: [] }], `/maintenance/${notStartedId}`);
        check('SCHEDULED task cannot be completed directly', early.text.includes('Start the task before recording its completion'), early.text.slice(0, 140));
      }

      const badAssign = await dispatchAction(jars['supervisor@emms.dev'], 'createMaintenanceTask', [mkTask(`${RUN} bad`, opUser!.id)], '/maintenance/new');
      check('operator cannot be assigned work', badAssign.text.includes('cannot be assigned maintenance work'), badAssign.text.slice(0, 140));

      const past = await dispatchAction(jars['supervisor@emms.dev'], 'createMaintenanceTask', [{ ...mkTask(`${RUN} past`, techUser!.id), scheduledDate: new Date(Date.now() - 86400000).toISOString() }], '/maintenance/new');
      check('past scheduled date rejected', past.text.includes('cannot be in the past'), past.text.slice(0, 140));
    }

    console.log('E. Downtime lifecycle');
    {
      const openEvent = await dispatchAction(jars['operator@emms.dev'], 'recordDowntimeEvent', [
        {
          equipmentId: (await prisma.equipment.findFirst({ orderBy: { name: 'asc' } }))!.id,
          startedAt: new Date(Date.now() - 3600000).toISOString(),
          endedAt: '',
          reason: 'MECHANICAL',
          notes: RUN,
        },
      ], '/downtime/new');
      const eventId = openEvent.redirectTo?.split('/').pop();
      check('recordDowntimeEvent redirects (OPEN)', !!eventId, `xr=${openEvent.redirectTo}`);
      if (eventId) {
        tracked.downtime.push(eventId);
        const event = await prisma.downtimeEvent.findUnique({ where: { id: eventId } });
        check('OPEN event persisted', event?.status === 'OPEN' && event.endedAt === null, `status=${event?.status}`);

        await dispatchAction(jars['technician@emms.dev'], 'resolveDowntimeEvent', [eventId, { endedAt: new Date().toISOString() }], `/downtime/${eventId}`);
        const afterResolve = await prisma.downtimeEvent.findUnique({ where: { id: eventId } });
        check('resolveDowntimeEvent RESOLVED the event', afterResolve?.status === 'RESOLVED' && afterResolve.endedAt !== null, `status=${afterResolve?.status}`);

        const again = await dispatchAction(jars['technician@emms.dev'], 'resolveDowntimeEvent', [eventId, { endedAt: new Date().toISOString() }], `/downtime/${eventId}`);
        check('double resolve rejected', again.text.includes('already been resolved'), again.text.slice(0, 140));
      }

      const crossed = await dispatchAction(jars['operator@emms.dev'], 'recordDowntimeEvent', [
        {
          equipmentId: (await prisma.equipment.findFirst({ orderBy: { name: 'asc' } }))!.id,
          startedAt: new Date().toISOString(),
          endedAt: new Date(Date.now() - 3600000).toISOString(),
          reason: 'MECHANICAL',
          notes: RUN,
        },
      ], '/downtime/new');
      check('record with end before start rejected', crossed.text.includes('End date/time must be after the start date/time.'), crossed.text.slice(0, 140));

      const ghostResolve = await dispatchAction(jars['technician@emms.dev'], 'resolveDowntimeEvent', ['ghost-event', { endedAt: new Date().toISOString() }], '/downtime/ghost-event');
      check('resolve ghost event reported', ghostResolve.text.includes('no longer exists'), ghostResolve.text.slice(0, 140));
    }

    console.log('F. Regression sweep (admin)');
    for (const page of STATIC_PAGES) {
      const res = await getPage(admin, page.path);
      check(`sweep ${page.path}`, res.status === 200, `status=${res.status}`);
    }
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