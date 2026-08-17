import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AuditEntityType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { setSession, invoke, type ActionResult } from './mocks';
import { listAuditLog } from '@/server/audit';
import {
  createEquipment,
  updateEquipment,
} from '@/server/actions/equipment';
import {
  createMaintenanceTask,
  updateMaintenanceTask,
  startMaintenanceTask,
  completeMaintenanceTask,
} from '@/server/actions/maintenance';
import {
  recordDowntimeEvent,
  resolveDowntimeEvent,
} from '@/server/actions/downtime';
import type {
  EquipmentFormValues,
  MaintenanceTaskFormValues,
  DowntimeEventFormValues,
} from '@/lib/validations';
import {
  cleanup,
  createFactory,
  createUser,
  createEquipment as createEquipmentRow,
  createTask,
  daysFromNow,
  unique,
} from './fixtures';

const PROBE = 'probe_audit';

const tracked = {
  factoryIds: [] as string[],
  userIds: [] as string[],
  equipmentIds: [] as string[],
  taskIds: [] as string[],
  recordIds: [] as string[],
  downtimeIds: [] as string[],
  auditIds: [] as string[],
};

let admin: string;
let supervisor: string;
let technician: string;
let operator: string;
let equipmentA: string;
let equipmentB: string;

function redirectUrl(result: ActionResult<unknown>): string | undefined {
  return result.kind === 'redirect' ? result.url : undefined;
}

async function auditRowsFor(entityType: AuditEntityType, entityId: string) {
  return prisma.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'asc' },
  });
}

let eqCounter = 0;

function equipmentValues(
  overrides: Partial<EquipmentFormValues> = {}
): EquipmentFormValues {
  eqCounter += 1;
  return {
    name: `${PROBE}_eq_${eqCounter}`,
    assetNumber: `${PROBE}_asset_${eqCounter}`,
    description: 'Probe equipment',
    location: 'Probe Bay',
    status: 'OPERATIONAL',
    criticality: '',
    factoryId: tracked.factoryIds[0],
    ...overrides,
  };
}

function taskValues(
  overrides: Partial<MaintenanceTaskFormValues> = {}
): MaintenanceTaskFormValues {
  return {
    title: unique(`${PROBE}_task`),
    description: 'Probe maintenance task',
    equipmentId: equipmentA,
    assignedUserId: technician,
    scheduledDate: new Date(Date.now() + 86400000).toISOString(),
    priority: 'MEDIUM',
    ...overrides,
  };
}

function downtimeValues(
  overrides: Partial<DowntimeEventFormValues> = {}
): DowntimeEventFormValues {
  return {
    equipmentId: equipmentA,
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    endedAt: '',
    reason: 'MECHANICAL',
    notes: PROBE,
    ...overrides,
  };
}

afterAll(async () => {
  await cleanup(tracked);
  await prisma.$disconnect();
});

beforeAll(async () => {
  tracked.factoryIds.push(await createFactory(`${PROBE}_factory`));
  admin = await createUser('ADMINISTRATOR', `${PROBE}_admin`);
  supervisor = await createUser('SUPERVISOR', `${PROBE}_sup`);
  technician = await createUser('TECHNICIAN', `${PROBE}_tech`);
  operator = await createUser('OPERATOR', `${PROBE}_op`);
  tracked.userIds.push(admin, supervisor, technician, operator);

  equipmentA = await createEquipmentRow(tracked.factoryIds[0], {
    name: `${PROBE}_equip_a`,
    assetNumber: `${PROBE}_asset_a`,
  });
  equipmentB = await createEquipmentRow(tracked.factoryIds[0], {
    name: `${PROBE}_equip_b`,
    assetNumber: `${PROBE}_asset_b`,
  });
  tracked.equipmentIds.push(equipmentA, equipmentB);

  setSession({
    id: admin,
    name: 'Admin Probe',
    email: 'admin.probe@test.local',
    role: 'ADMINISTRATOR',
  });
});

describe('audit data layer', () => {
  it('lists entries newest-first with the actor included', async () => {
    const older = await prisma.auditLog.create({
      data: {
        actorId: technician,
        action: 'CREATE',
        entityType: 'DOWNTIME_EVENT',
        entityId: unique('evt'),
        entityLabel: `${PROBE}_older`,
        createdAt: new Date(Date.now() - 86400000),
      },
    });
    const newer = await prisma.auditLog.create({
      data: {
        actorId: technician,
        action: 'RESOLVE',
        entityType: 'DOWNTIME_EVENT',
        entityId: unique('evt'),
        entityLabel: `${PROBE}_newer`,
        createdAt: new Date(Date.now() - 3600000),
      },
    });
    tracked.auditIds.push(older.id, newer.id);

    const result = await listAuditLog({ q: PROBE, page: 1 });
    const ids = result.items.map((entry) => entry.id);
    expect(ids).toContain(older.id);
    expect(ids).toContain(newer.id);
    expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id));
    expect(result.items.every((entry) => entry.actor.name)).toBe(true);
  });

  it('filters by actor, action, and entity type', async () => {
    const created = await prisma.auditLog.create({
      data: {
        actorId: operator,
        action: 'CREATE',
        entityType: 'EQUIPMENT',
        entityId: unique('eq'),
        entityLabel: `${PROBE}_filter_one`,
      },
    });
    const updated = await prisma.auditLog.create({
      data: {
        actorId: supervisor,
        action: 'UPDATE',
        entityType: 'MAINTENANCE_TASK',
        entityId: unique('task'),
        entityLabel: `${PROBE}_filter_two`,
      },
    });
    tracked.auditIds.push(created.id, updated.id);

    const byActor = await listAuditLog({
      q: PROBE,
      actorId: operator,
      page: 1,
    });
    expect(byActor.items.map((entry) => entry.id)).toContain(created.id);
    expect(byActor.items.map((entry) => entry.id)).not.toContain(updated.id);

    const byAction = await listAuditLog({
      q: PROBE,
      action: 'UPDATE',
      page: 1,
    });
    expect(byAction.items.every((entry) => entry.action === 'UPDATE')).toBe(
      true
    );

    const byType = await listAuditLog({
      q: PROBE,
      entityType: 'EQUIPMENT',
      page: 1,
    });
    expect(byType.items.every((entry) => entry.entityType === 'EQUIPMENT')).toBe(
      true
    );
    expect(byType.items.map((entry) => entry.id)).toContain(created.id);
  });

  it('searches actor name and entity label', async () => {
    const row = await prisma.auditLog.create({
      data: {
        actorId: supervisor,
        action: 'START',
        entityType: 'MAINTENANCE_TASK',
        entityId: unique('task'),
        entityLabel: `${PROBE}_needle_label`,
      },
    });
    tracked.auditIds.push(row.id);

    const byLabel = await listAuditLog({ q: 'needle_label', page: 1 });
    expect(byLabel.items.map((entry) => entry.id)).toContain(row.id);

    const byActorName = await listAuditLog({ q: `${PROBE}_sup`, page: 1 });
    expect(byActorName.items.map((entry) => entry.id)).toContain(row.id);
  });

  it('filters by date range on createdAt', async () => {
    const past = await prisma.auditLog.create({
      data: {
        actorId: technician,
        action: 'COMPLETE',
        entityType: 'MAINTENANCE_TASK',
        entityId: unique('task'),
        entityLabel: `${PROBE}_daterange`,
        createdAt: new Date(Date.now() - 5 * 86400000),
      },
    });
    const recentDay = new Date(Date.now() - 2 * 86400000);
    const today = await prisma.auditLog.create({
      data: {
        actorId: technician,
        action: 'COMPLETE',
        entityType: 'MAINTENANCE_TASK',
        entityId: unique('task'),
        entityLabel: `${PROBE}_daterange`,
        createdAt: recentDay,
      },
    });
    tracked.auditIds.push(past.id, today.id);

    const span = await listAuditLog({
      q: 'daterange',
      from: new Date(Date.now() - 3 * 86400000)
        .toISOString()
        .slice(0, 10),
      to: daysFromNow(0),
      page: 1,
    });
    const spanIds = span.items.map((entry) => entry.id);
    expect(spanIds).toContain(today.id);
    expect(spanIds).not.toContain(past.id);
  });

  it('paginates at the audit page size', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 22; i += 1) {
      const row = await prisma.auditLog.create({
        data: {
          actorId: technician,
          action: 'CREATE',
          entityType: 'EQUIPMENT',
          entityId: unique('eq'),
          entityLabel: `${PROBE}_pager`,
        },
      });
      ids.push(row.id);
    }
    tracked.auditIds.push(...ids);

    const pageOne = await listAuditLog({ q: `${PROBE}_pager`, page: 1 });
    expect(pageOne.items).toHaveLength(20);
    const pageTwo = await listAuditLog({ q: `${PROBE}_pager`, page: 2 });
    expect(pageTwo.items).toHaveLength(2);
    expect(pageOne.total).toBe(22);
    expect(pageOne.totalPages).toBe(2);
  });
});

describe('equipment mutations write audit entries', () => {
  it('creates a CREATE/EQUIPMENT entry for the session actor', async () => {
    const values = equipmentValues();
    const result = await invoke(() => createEquipment(values));
    expect(result.kind).toBe('redirect');
    const id = redirectUrl(result)!.split('/').pop()!;
    tracked.equipmentIds.push(id);

    const rows = await auditRowsFor('EQUIPMENT', id);
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('CREATE');
    expect(rows[0].actorId).toBe(admin);
    expect(rows[0].entityLabel).toBe(values.name);
  });

  it('writes an UPDATE/EQUIPMENT entry on edit', async () => {
    const values = equipmentValues();
    const result = await invoke(() => createEquipment(values));
    const id = redirectUrl(result)!.split('/').pop()!;
    tracked.equipmentIds.push(id);

    const updated = await invoke(() =>
      updateEquipment(id, { ...values, name: `${values.name}_v2` })
    );
    expect(updated.kind).toBe('redirect');

    const rows = await auditRowsFor('EQUIPMENT', id);
    expect(rows.map((row) => row.action)).toEqual(['CREATE', 'UPDATE']);
    expect(rows[1].actorId).toBe(admin);
    expect(rows[1].entityLabel).toBe(`${values.name}_v2`);
  });

  it('leaves no audit entry when creation fails validation', async () => {
    const before = await prisma.auditLog.count();
    const result = await invoke(() =>
      createEquipment({ ...equipmentValues(), name: '' })
    );
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect(result.value.ok).toBe(false);
    }
    const after = await prisma.auditLog.count();
    expect(after).toBe(before);
  });
});

describe('maintenance mutations write audit entries', () => {
  it('writes CREATE, UPDATE, START, and COMPLETE entries across the lifecycle', async () => {
    setSession({
      id: supervisor,
      name: 'Supervisor Probe',
      email: 'sup.probe@test.local',
      role: 'SUPERVISOR',
    });
    const created = await invoke(() => createMaintenanceTask(taskValues()));
    expect(created.kind).toBe('redirect');
    const id = redirectUrl(created)!.split('/').pop()!;
    tracked.taskIds.push(id);

    const edited = await invoke(() =>
      updateMaintenanceTask(id, taskValues({ title: `${PROBE}_edited` }))
    );
    expect(edited.kind).toBe('redirect');

    setSession({
      id: technician,
      name: 'Technician Probe',
      email: 'tech.probe@test.local',
      role: 'TECHNICIAN',
    });
    const started = await invoke(() => startMaintenanceTask(id));
    if (started.kind === 'result') {
      expect(started.value.ok).toBe(true);
    }

    const completed = await invoke(() =>
      completeMaintenanceTask(id, {
        description: `${PROBE} work`,
        notes: '',
        parts: [],
      })
    );
    if (completed.kind === 'result') {
      expect(completed.value.ok).toBe(true);
    }

    const rows = await auditRowsFor('MAINTENANCE_TASK', id);
    expect(rows.map((row) => row.action)).toEqual([
      'CREATE',
      'UPDATE',
      'START',
      'COMPLETE',
    ]);
    expect(rows[0].actorId).toBe(supervisor);
    expect(rows[1].actorId).toBe(supervisor);
    expect(rows[2].actorId).toBe(technician);
    expect(rows[3].actorId).toBe(technician);
    expect(rows[0].entityLabel).toContain(PROBE);
  });

  it('leaves no audit entry when start is rejected for a non-assigned user', async () => {
    const id = await createTask(equipmentA, supervisor, {
      title: `${PROBE}_nonauth`,
    });
    tracked.taskIds.push(id);

    setSession({
      id: technician,
      name: 'Technician Probe',
      email: 'tech.probe@test.local',
      role: 'TECHNICIAN',
    });
    const result = await invoke(() => startMaintenanceTask(id));
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect(result.value.ok).toBe(false);
    }
    const rows = await auditRowsFor('MAINTENANCE_TASK', id);
    expect(rows).toHaveLength(0);
  });

  it('leaves no audit entry when completing a task that was never started', async () => {
    const id = await createTask(equipmentA, technician, {
      title: `${PROBE}_unstarted`,
    });
    tracked.taskIds.push(id);

    setSession({
      id: technician,
      name: 'Technician Probe',
      email: 'tech.probe@test.local',
      role: 'TECHNICIAN',
    });
    const result = await invoke(() =>
      completeMaintenanceTask(id, { description: 'x', notes: '', parts: [] })
    );
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect(result.value.ok).toBe(false);
    }
    const rows = await auditRowsFor('MAINTENANCE_TASK', id);
    expect(rows).toHaveLength(0);
  });
});

describe('downtime mutations write audit entries', () => {
  it('creates a CREATE/DOWNTIME_EVENT entry and ignores client-supplied actor ids', async () => {
    setSession({
      id: operator,
      name: 'Operator Probe',
      email: 'op.probe@test.local',
      role: 'OPERATOR',
    });
    const values = downtimeValues();
    const result = await invoke(() =>
      recordDowntimeEvent({
        ...values,
        reportedById: admin,
        actorId: admin,
      } as DowntimeEventFormValues)
    );
    expect(result.kind).toBe('redirect');
    const eventId = redirectUrl(result)!.split('/').pop()!;
    tracked.downtimeIds.push(eventId);

    const rows = await auditRowsFor('DOWNTIME_EVENT', eventId);
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('CREATE');
    expect(rows[0].actorId).toBe(operator);
    expect(rows[0].entityLabel).toContain(`_equip_a`);

    const event = await prisma.downtimeEvent.findUnique({
      where: { id: eventId },
    });
    expect(event?.reportedById).toBe(operator);
  });

  it('writes a RESOLVE/DOWNTIME_EVENT entry and no extras', async () => {
    setSession({
      id: operator,
      name: 'Operator Probe',
      email: 'op.probe@test.local',
      role: 'OPERATOR',
    });
    const result = await invoke(() => recordDowntimeEvent(downtimeValues()));

    setSession({
      id: technician,
      name: 'Technician Probe',
      email: 'tech.probe@test.local',
      role: 'TECHNICIAN',
    });
    const eventId = redirectUrl(result)!.split('/').pop()!;
    tracked.downtimeIds.push(eventId);

    const resolved = await invoke(() =>
      resolveDowntimeEvent(eventId, { endedAt: new Date().toISOString() })
    );
    expect(resolved.kind).toBe('result');
    if (resolved.kind === 'result') {
      expect(resolved.value.ok).toBe(true);
    }

    const rows = await auditRowsFor('DOWNTIME_EVENT', eventId);
    expect(rows.map((row) => row.action)).toEqual(['CREATE', 'RESOLVE']);
    expect(rows[0].actorId).toBe(operator);
    expect(rows[1].actorId).toBe(technician);

    const again = await invoke(() =>
      resolveDowntimeEvent(eventId, { endedAt: new Date().toISOString() })
    );
    expect(again.kind).toBe('result');
    if (again.kind === 'result') {
      expect(again.value.ok).toBe(false);
    }
    expect(await auditRowsFor('DOWNTIME_EVENT', eventId)).toHaveLength(2);
  });

  it('leaves no audit entry when the equipment no longer exists', async () => {
    setSession({
      id: operator,
      name: 'Operator Probe',
      email: 'op.probe@test.local',
      role: 'OPERATOR',
    });
    const before = await prisma.auditLog.count();
    const result = await invoke(() =>
      recordDowntimeEvent(
        downtimeValues({ equipmentId: 'ghost-equipment' })
      )
    );
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect(result.value.ok).toBe(false);
    }
    expect(await prisma.auditLog.count()).toBe(before);
  });
});