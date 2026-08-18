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
const RUN = `m14run_${Date.now().toString(36)}`;

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
    text: (await res.text()).slice(0, 16000),
  };
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

async function ensureFactory(): Promise<string> {
  const factory = await prisma.factory.findFirst();
  if (factory) return factory.id;
  const created = await prisma.factory.create({
    data: { name: `${RUN} Factory`, location: `${RUN} Loc` },
  });
  return created.id;
}

const trackedEquipment: string[] = [];

async function cleanup(): Promise<void> {
  const deleted = await prisma.equipment.deleteMany({
    where: { id: { in: trackedEquipment } },
  });
  await prisma.auditLog.deleteMany({
    where: { entityLabel: { contains: RUN } },
  });
  console.log(`  cleanup: ${deleted.count} archived equipment rows removed`);
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

    console.log('A. Equipment deletion permission in the RBAC matrix');
    for (const { role } of SEED_ROLES) {
      check(
        `${role} equipmentDelete`,
        roleHasPermission(role, PERMISSIONS.equipmentDelete) ===
          (role === 'ADMINISTRATOR' || role === 'SUPERVISOR'),
        'matrix'
      );
    }

    console.log('B. Create equipment to archive through the running server');
    const factoryId = await ensureFactory();
    const createRes = await dispatchAction(
      admin,
      'createEquipment',
      [
        {
          name: `${RUN} Press`,
          assetNumber: `${RUN}ASSET`,
          description: 'runtime probe',
          location: 'Section Probe',
          status: 'OPERATIONAL',
          criticality: 'High',
          factoryId,
        },
      ],
      '/equipment/new'
    );
    const equipmentId = createRes.redirectTo?.split('/').pop();
    check(
      'createEquipment redirects to detail page',
      !!equipmentId,
      `xr=${createRes.redirectTo}`
    );

    if (equipmentId) {
      trackedEquipment.push(equipmentId);
      const before = await prisma.equipment.findUnique({
        where: { id: equipmentId },
      });
      check('created equipment is active', before?.deletedAt === null);

      console.log('C. Archive action soft-deletes and writes audit');
      const supervisor = jars['supervisor@emms.dev'];

      const detailAdmin = await getPage(admin, `/equipment/${equipmentId}`);
      check(
        'admin sees the Archive button on the detail page',
        detailAdmin.status === 200 &&
          /Archive\s*</.test(detailAdmin.text),
        `status=${detailAdmin.status} hasArchive=/${'Archive\\s*<'}/.test`
      );

      const detailTech = await getPage(
        jars['technician@emms.dev'],
        `/equipment/${equipmentId}`
      );
      check(
        'technician does not see the Archive button',
        detailTech.status === 200 && !/Archive\s*</.test(detailTech.text),
        `status=${detailTech.status}`
      );

      const detailOp = await getPage(
        jars['operator@emms.dev'],
        `/equipment/${equipmentId}`
      );
      check(
        'operator does not see the Archive button',
        detailOp.status === 200 && !/Archive\s*</.test(detailOp.text),
        `status=${detailOp.status}`
      );

      const archive = await dispatchAction(
        supervisor,
        'deleteEquipment',
        [equipmentId],
        `/equipment/${equipmentId}`
      );
      check(
        'deleteEquipment reports success (no error string)',
        !archive.text.includes('"ok":false'),
        archive.text.slice(0, 160)
      );

      const after = await prisma.equipment.findUnique({
        where: { id: equipmentId },
      });
      check('equipment row is kept but archived', after?.deletedAt !== null);

      const audits = await prisma.auditLog.findMany({
        where: { entityType: 'EQUIPMENT', entityId: equipmentId },
        orderBy: { createdAt: 'asc' },
      });
      check(
        'CREATE and DELETE audit rows written',
        audits.length === 2 &&
          audits[0].action === 'CREATE' &&
          audits[1].action === 'DELETE' &&
          audits[1].entityLabel === `${RUN} Press`,
        JSON.stringify(audits.map((a) => a.action + ':' + a.entityLabel))
      );

      console.log('D. Archived equipment disappears from the live registry');
      const registry = await getPage(
        supervisor,
        `/equipment?q=${encodeURIComponent(RUN)}`
      );
      check(
        'registry no longer lists the archived equipment',
        registry.status === 200 && !registry.text.includes(`${RUN} Press`),
        `status=${registry.status}`
      );

      console.log('E. Archive state is surfaced on the detail page');
      const detailAfter = await getPage(
        supervisor,
        `/equipment/${equipmentId}`
      );
      check(
        'detail page still renders with archived banner',
        detailAfter.status === 200 &&
          detailAfter.text.includes('has been archived'),
        `status=${detailAfter.status}`
      );
      check(
        'Archive and Edit buttons hidden on archived detail page',
        !/Archive\s*</.test(detailAfter.text) &&
          !/Edit\s*</.test(detailAfter.text),
        'buttons'
      );

      console.log('F. Archived equipment rejected by record actions');
      const activeEquipment = await prisma.equipment.findFirst({
        where: { deletedAt: null },
      });
      const technician = await prisma.user.findFirst({
        where: { role: 'TECHNICIAN' },
      });
      if (activeEquipment && technician) {
        const rejectMaint = await dispatchAction(
          supervisor,
          'createMaintenanceTask',
          [
            {
              title: `${RUN} task`,
              description: 'runtime probe',
              equipmentId,
              assignedUserId: technician.id,
              scheduledDate: new Date(Date.now() + 86400000).toISOString(),
              priority: 'MEDIUM',
            },
          ],
          '/maintenance/new'
        );
        check(
          'scheduling against archived equipment rejected',
          rejectMaint.text.includes('has been archived'),
          rejectMaint.text.slice(0, 160)
        );

        const rejectDowntime = await dispatchAction(
          jars['operator@emms.dev'],
          'recordDowntimeEvent',
          [
            {
              equipmentId,
              startedAt: new Date(Date.now() - 3600000).toISOString(),
              endedAt: '',
              reason: 'MECHANICAL',
              notes: '',
            },
          ],
          '/downtime/new'
        );
        check(
          'recording downtime against archived equipment rejected',
          rejectDowntime.text.includes('has been archived') ||
            rejectDowntime.text.includes('no longer exist'),
          rejectDowntime.text.slice(0, 160)
        );

        const rejectEdit = await dispatchAction(
          supervisor,
          'updateEquipment',
          [
            equipmentId,
            {
              name: `${RUN} Renamed`,
              assetNumber: `${RUN}ASSET2`,
              description: '',
              location: 'Section Probe',
              status: 'OPERATIONAL',
              criticality: '',
              factoryId,
            },
          ],
          `/equipment/${equipmentId}/edit`
        );
        check(
          'editing archived equipment rejected',
          rejectEdit.text.includes('has been archived'),
          rejectEdit.text.slice(0, 160)
        );
      } else {
        check('posted equipment guard', false, 'no active equipment found');
      }
    }

    console.log('G. Audit page surfaces the delete filter');
    const auditPage = await getPage(admin, '/audit?action=DELETE');
    check(
      'audit page renders with DELETE filter',
      auditPage.status === 200 &&
        (auditPage.text.includes('Deleted') ||
          auditPage.text.includes('deleted')),
      `status=${auditPage.status}`
    );
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