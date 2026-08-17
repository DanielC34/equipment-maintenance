import 'dotenv/config';
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import prisma from '@/lib/prisma';
import { PERMISSIONS, roleHasPermission } from '@/lib/permissions';
import type { Role } from '@prisma/client';

const HOST = '127.0.0.1';
const PORT = Number(process.env.VERIFY_PORT ?? 3200);
const BASE = `http://${HOST}:${PORT}`;
const PASSWORD = 'password123';
const RUN = `m12run_${Date.now().toString(36)}`;

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
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        {
          entityId: {
            in: [
              ...tracked.downtime,
              ...tracked.records,
              ...tracked.tasks,
              ...tracked.equipment,
            ],
          },
        },
        { entityLabel: { contains: RUN } },
      ],
    },
  });
  await prisma.downtimeEvent.deleteMany({
    where: { id: { in: tracked.downtime } },
  });
  await prisma.partUsed.deleteMany({
    where: { maintenanceRecordId: { in: tracked.records } },
  });
  await prisma.maintenanceRecord.deleteMany({
    where: { id: { in: tracked.records } },
  });
  await prisma.maintenanceTask.deleteMany({
    where: { id: { in: tracked.tasks } },
  });
  await prisma.equipment.deleteMany({
    where: { id: { in: tracked.equipment } },
  });
  console.log(
    `  cleanup: ${tracked.equipment.length} equipment, ${tracked.tasks.length} tasks, ${tracked.records.length} records, ${tracked.downtime.length} downtime`
  );
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

    console.log('A. Authz boundaries for the audit log');
    await expectRedirect('anon /audit -> /login', null, '/audit', '/login');
    await expectPage('admin /audit renders', admin, '/audit', 'Audit Log');
    await expectDenied('supervisor /audit denied', jars['supervisor@emms.dev'], '/audit');
    await expectDenied('technician /audit denied', jars['technician@emms.dev'], '/audit');
    await expectDenied('operator /audit denied', jars['operator@emms.dev'], '/audit');
    await expectDenied('manager /audit denied', jars['manager@emms.dev'], '/audit');
    await expectDenied('reliability /audit denied', jars['reliability@emms.dev'], '/audit');

    console.log('B. Role / page matrix');
    for (const { email, role } of SEED_ROLES) {
      checkPageMatrix(jars[email], role);
    }

    console.log('C. Equipment mutations write audit entries');
    {
      const factories = await prisma.factory.findMany({ take: 1 });
      const factoryId = factories[0].id;
      const adminUser = await prisma.user.findUnique({
        where: { email: 'admin@emms.dev' },
        select: { id: true },
      });

      const values = (assetNumber: string, name = `${RUN} CNC`) => ({
        name,
        assetNumber,
        description: `${RUN} runtime probe`,
        location: 'Probe Bay',
        status: 'OPERATIONAL',
        criticality: 'High',
        factoryId,
      });

      const created = await dispatchAction(admin, 'createEquipment', [values(`${RUN}_a1`)], '/equipment/new');
      const eqId = created.redirectTo?.split('/').pop();
      check('createEquipment redirects', !!eqId, `xr=${created.redirectTo}`);
      if (eqId) {
        tracked.equipment.push(eqId);
        const rows = await prisma.auditLog.findMany({
          where: { entityType: 'EQUIPMENT', entityId: eqId },
        });
        check(
          'CREATE/EQUIPMENT audit row written with session actor',
          rows.length === 1 &&
            rows[0].action === 'CREATE' &&
            rows[0].actorId === adminUser?.id &&
            rows[0].entityLabel === `${RUN} CNC`,
          JSON.stringify(rows)
        );

        const updated = await dispatchAction(admin, 'updateEquipment', [
          eqId,
          { ...values(`${RUN}_a1`, `${RUN} CNC v2`), name: `${RUN} CNC v2`, location: 'Probe Bay 2', status: 'UNDER_MAINTENANCE' },
        ], `/equipment/${eqId}/edit`);
        check('updateEquipment redirects', !!updated.redirectTo, `xr=${updated.redirectTo}`);
        const rowsAfter = await prisma.auditLog.findMany({
          where: { entityType: 'EQUIPMENT', entityId: eqId },
          orderBy: { createdAt: 'asc' },
        });
        check(
          'UPDATE/EQUIPMENT audit row appended',
          rowsAfter.map((r) => r.action).join(',') === 'CREATE,UPDATE' &&
            rowsAfter[1].entityLabel === `${RUN} CNC v2`,
          JSON.stringify(rowsAfter.map((r) => r.action))
        );
      }

      const dup = await dispatchAction(admin, 'createEquipment', [values(`${RUN}_a1`)], '/equipment/new');
      check('duplicate asset rejected', dup.text.includes('already exists'), dup.text.slice(0, 140));
      const auditLabelFilter = { entityLabel: { contains: RUN } };
      const afterDup = await prisma.auditLog.count({ where: auditLabelFilter });
      check(
        'failed duplicate create wrote no audit row',
        afterDup === 2,
        `count=${afterDup} (expect 2: CREATE + UPDATE)`
      );

      const bad = await dispatchAction(admin, 'createEquipment', [{ ...values(`${RUN}_bad`), name: '' }], '/equipment/new');
      check('invalid create writes no audit row', bad.text.includes('Equipment name is required.'), bad.text.slice(0, 140));
      const afterBad = await prisma.auditLog.count({ where: auditLabelFilter });
      check('no audit row for failed validation', afterBad === 2, `count=${afterBad}`);
    }

    console.log('D. Maintenance lifecycle writes audit entries');
    {
      const techUser = await prisma.user.findUnique({
        where: { email: 'technician@emms.dev' },
        select: { id: true },
      });
      const equipment = await prisma.equipment.findFirst({
        where: { status: { not: 'OFFLINE' } },
      });

      const mkTask = (title: string) => ({
        title,
        description: 'runtime probe',
        equipmentId: equipment!.id,
        assignedUserId: techUser!.id,
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        priority: 'MEDIUM',
      });

      const created = await dispatchAction(jars['supervisor@emms.dev'], 'createMaintenanceTask', [mkTask(`${RUN} task`)], '/maintenance/new');
      const taskId = created.redirectTo?.split('/').pop();
      check('createMaintenanceTask redirects', !!taskId, `xr=${created.redirectTo}`);
      if (taskId) {
        tracked.tasks.push(taskId);
        const rows = await prisma.auditLog.findMany({
          where: { entityType: 'MAINTENANCE_TASK', entityId: taskId },
          orderBy: { createdAt: 'asc' },
        });
        check(
          'CREATE/MAINTENANCE_TASK audit row written',
          rows.length === 1 &&
            rows[0].action === 'CREATE' &&
            rows[0].entityLabel === `${RUN} task`,
          JSON.stringify(rows)
        );

        const wrong = await dispatchAction(jars['supervisor@emms.dev'], 'startMaintenanceTask', [taskId], `/maintenance/${taskId}`);
        const stillScheduled = await prisma.maintenanceTask.findUnique({ where: { id: taskId } });
        check(
          'non-assigned start rejected (no audit)',
          stillScheduled?.status === 'SCHEDULED' &&
            wrong.text.includes('Only the technician assigned') &&
            (await prisma.auditLog.count({ where: { action: 'START', entityId: taskId } })) === 0,
          `status=${stillScheduled?.status}`
        );

        await dispatchAction(jars['technician@emms.dev'], 'startMaintenanceTask', [taskId], `/maintenance/${taskId}`);
        const startRow = await prisma.auditLog.findFirst({
          where: { action: 'START', entityId: taskId },
        });
        check('START/MAINTENANCE_TASK audit row written', startRow !== null && startRow.actorId === techUser?.id, JSON.stringify(startRow));

        await dispatchAction(jars['technician@emms.dev'], 'completeMaintenanceTask', [taskId, { description: `${RUN} work`, notes: '', parts: [{ name: 'Filter', quantity: 2 }] }], `/maintenance/${taskId}`);
        const completeRow = await prisma.auditLog.findFirst({
          where: { action: 'COMPLETE', entityId: taskId },
        });
        const record = await prisma.maintenanceRecord.findUnique({ where: { taskId } });
        check('COMPLETE/MAINTENANCE_TASK audit row written', completeRow !== null && completeRow.actorId === techUser?.id, JSON.stringify(completeRow));
        if (record) {
          tracked.records.push(record.id);
        }

        const actions = (
          await prisma.auditLog.findMany({
            where: { entityId: taskId },
            orderBy: { createdAt: 'asc' },
          })
        ).map((r) => r.action);
        check('lifecycle actions recorded CREATE,START,COMPLETE', actions.join(',') === 'CREATE,START,COMPLETE', actions.join(','));

        const second = await dispatchAction(jars['technician@emms.dev'], 'completeMaintenanceTask', [taskId, { description: 'x', notes: '', parts: [] }], `/maintenance/${taskId}`);
        check('double completion rejected (no new audit)', second.text.includes('already been completed') && (await prisma.auditLog.count({ where: { entityId: taskId } })) === 3, second.text.slice(0, 140));
      }
    }

    console.log('E. Downtime lifecycle writes audit entries');
    {
      const equipment = await prisma.equipment.findFirst({
        orderBy: { name: 'asc' },
      });
      const openEvent = await dispatchAction(jars['operator@emms.dev'], 'recordDowntimeEvent', [
        {
          equipmentId: equipment!.id,
          startedAt: new Date(Date.now() - 3600000).toISOString(),
          endedAt: '',
          reason: 'MECHANICAL',
          notes: RUN,
        },
      ], '/downtime/new');
      const eventId = openEvent.redirectTo?.split('/').pop();
      check('recordDowntimeEvent redirects', !!eventId, `xr=${openEvent.redirectTo}`);
      if (eventId) {
        tracked.downtime.push(eventId);
        const rows = await prisma.auditLog.findMany({
          where: { entityType: 'DOWNTIME_EVENT', entityId: eventId },
          orderBy: { createdAt: 'asc' },
        });
        check(
          'CREATE/DOWNTIME_EVENT audit row written',
          rows.length === 1 &&
            rows[0].action === 'CREATE' &&
            rows[0].entityLabel === `${equipment!.name} · ${equipment!.assetNumber}`,
          JSON.stringify(rows)
        );

        const crossed = await dispatchAction(jars['operator@emms.dev'], 'recordDowntimeEvent', [
          {
            equipmentId: equipment!.id,
            startedAt: new Date().toISOString(),
            endedAt: new Date(Date.now() - 3600000).toISOString(),
            reason: 'MECHANICAL',
            notes: RUN,
          },
        ], '/downtime/new');
        check('crossed-time create rejected (no audit)', crossed.text.includes('End date/time must be after the start date/time.'), crossed.text.slice(0, 140));
        const createOnly = await prisma.auditLog.count({
          where: { entityType: 'DOWNTIME_EVENT', entityId: eventId },
        });
        check('still exactly one create row for the event', createOnly === 1, `count=${createOnly}`);

        await dispatchAction(jars['technician@emms.dev'], 'resolveDowntimeEvent', [eventId, { endedAt: new Date().toISOString() }], `/downtime/${eventId}`);
        const resolveRow = await prisma.auditLog.findFirst({
          where: { action: 'RESOLVE', entityId: eventId },
        });
        check('RESOLVE/DOWNTIME_EVENT audit row written', resolveRow !== null && resolveRow.actorId !== null, JSON.stringify(resolveRow));

        const again = await dispatchAction(jars['technician@emms.dev'], 'resolveDowntimeEvent', [eventId, { endedAt: new Date().toISOString() }], `/downtime/${eventId}`);
        check('double resolve rejected (no new audit)', again.text.includes('already been resolved') && (await prisma.auditLog.count({ where: { entityId: eventId } })) === 2, again.text.slice(0, 140));
      }
    }

    console.log('F. Audit log UI filter and pagination');
    {
      const page = await getPage(admin, '/audit');
      check('audit page lists entries', page.status === 200 && page.text.includes(RUN), `bytes=${page.text.length}`);

      const byAction = await getPage(admin, `/audit?action=CREATE`);
      check('audit page filters by action', byAction.status === 200 && byAction.text.includes('Created'), `bytes=${byAction.text.length}`);

      const byType = await getPage(admin, `/audit?entityType=DOWNTIME_EVENT`);
      check('audit page filters by entity type', byType.status === 200 && byType.text.includes('Downtime event'), `bytes=${byType.text.length}`);

      const byActor = await getPage(admin, `/audit?actorId=${(await prisma.user.findUnique({ where: { email: 'technician@emms.dev' } }))!.id}`);
      check('audit page filters by user', byActor.status === 200, `bytes=${byActor.text.length}`);

      const bySearch = await getPage(admin, `/audit?q=${RUN}`);
      check('audit page searches', bySearch.status === 200 && bySearch.text.includes(RUN), `bytes=${bySearch.text.length}`);

      const noMatch = await getPage(admin, `/audit?q=zzznomatch_${RUN}`);
      check('audit empty state for no match', noMatch.status === 200 && noMatch.text.includes('No audit entries match your filters'), `bytes=${noMatch.text.length}`);
    }

    console.log('G. Regression sweep (admin)');
    for (const page of STATIC_PAGES) {
      const res = await getPage(admin, page.path);
      check(`sweep ${page.path}`, res.status === 200, `status=${res.status}`);
    }

    const auditTotal = await prisma.auditLog.count();
    console.log(`  audit rows produced this run: ${auditTotal}`);
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