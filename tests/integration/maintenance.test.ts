import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '@/lib/prisma';
import { setSession, invoke, type ActionResult } from './mocks';
import {
  listMaintenanceTasks,
  listMaintenanceHistory,
  getMaintenanceTaskById,
  getMaintenanceRecordById,
  listAssignableUsers,
  userCanBeAssigned,
} from '@/server/maintenance';
import {
  createMaintenanceTask,
  updateMaintenanceTask,
  startMaintenanceTask,
  completeMaintenanceTask,
} from '@/server/actions/maintenance';
import type {
  MaintenanceTaskFormValues,
  MaintenanceCompletionValues,
} from '@/lib/validations';
import {
  cleanup,
  createFactory,
  createUser,
  createEquipment as createEquipmentRow,
  createTask,
  createRecord,
  dateAtDaysFromNow,
  daysFromNow,
} from './fixtures';

const PROBE = 'probe_maint';

const tracked = {
  factoryIds: [] as string[],
  userIds: [] as string[],
  equipmentIds: [] as string[],
  taskIds: [] as string[],
  recordIds: [] as string[],
};

let technician: string;
let supervisor: string;
let operator: string;
let equipmentA: string;
let equipmentB: string;

function redirectUrl(result: ActionResult<unknown>): string | undefined {
  return result.kind === 'redirect' ? result.url : undefined;
}

function taskFormValues(
  overrides: Partial<MaintenanceTaskFormValues> = {}
): MaintenanceTaskFormValues {
  return {
    title: `${PROBE}_task`,
    description: 'Probe maintenance task',
    equipmentId: equipmentA,
    assignedUserId: technician,
    scheduledDate: new Date(Date.now() + 86400000).toISOString(),
    priority: 'MEDIUM',
    ...overrides,
  };
}

afterAll(async () => {
  await cleanup(tracked);
  await prisma.$disconnect();
});

beforeAll(async () => {
  tracked.factoryIds.push(await createFactory(`${PROBE}_factory`));
  technician = await createUser('TECHNICIAN', `${PROBE}_tech`);
  supervisor = await createUser('SUPERVISOR', `${PROBE}_sup`);
  operator = await createUser('OPERATOR', `${PROBE}_op`);
  tracked.userIds.push(technician, supervisor, operator);

  equipmentA = await createEquipmentRow(tracked.factoryIds[0], {
    name: `${PROBE}_equip_a`,
    assetNumber: `${PROBE}_asset_a`,
  });
  equipmentB = await createEquipmentRow(tracked.factoryIds[0], {
    name: `${PROBE}_equip_b`,
    assetNumber: `${PROBE}_asset_b`,
  });
  tracked.equipmentIds.push(equipmentA, equipmentB);

  setSession({ id: technician, name: 'Technician', email: 'tech@test.local', role: 'TECHNICIAN' });
});

describe('maintenance data layer', () => {
  it('lists and orders tasks by scheduled date ascending', async () => {
    const near = await createTask(equipmentA, technician, {
      title: `${PROBE}_near`,
      scheduledDate: dateAtDaysFromNow(1),
    });
    const far = await createTask(equipmentA, technician, {
      title: `${PROBE}_far`,
      scheduledDate: dateAtDaysFromNow(10),
    });
    tracked.taskIds.push(near, far);

    const result = await listMaintenanceTasks({ q: PROBE, page: 1 });
    const titles = result.items.map((t) => t.title);
    expect(titles).toContain(`${PROBE}_near`);
    expect(titles).toContain(`${PROBE}_far`);
    const nearIndex = titles.indexOf(`${PROBE}_near`);
    const farIndex = titles.indexOf(`${PROBE}_far`);
    expect(nearIndex).toBeLessThan(farIndex);
    expect(result.items.every((t) => t.equipment.name.includes(PROBE))).toBe(
      true
    );
  });

  it('filters tasks by status and priority', async () => {
    const inProgress = await createTask(equipmentA, technician, {
      title: `${PROBE}_inprogress`,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    });
    tracked.taskIds.push(inProgress);

    const statusFiltered = await listMaintenanceTasks({
      q: PROBE,
      status: 'IN_PROGRESS',
      page: 1,
    });
    expect(statusFiltered.items.some((t) => t.id === inProgress)).toBe(true);
    expect(statusFiltered.items.every((t) => t.status === 'IN_PROGRESS')).toBe(
      true
    );

    const priorityFiltered = await listMaintenanceTasks({
      q: PROBE,
      priority: 'HIGH',
      page: 1,
    });
    expect(
      priorityFiltered.items.every((t) => t.priority === 'HIGH')
    ).toBe(true);
  });

  it('reads a task with its relations', async () => {
    const task = await getMaintenanceTaskById(tracked.taskIds[0]);
    expect(task?.equipment.id).toBe(equipmentA);
    expect(task?.assignedUser?.id).toBe(technician);
  });

  it('filters maintenance history by from/to inclusively', async () => {
    const r1 = await createRecord(equipmentA, technician, {
      description: `${PROBE}_hist`,
      completedDate: dateAtDaysFromNow(-4),
    });
    const r2 = await createRecord(equipmentA, technician, {
      description: `${PROBE}_hist`,
      completedDate: dateAtDaysFromNow(-2),
    });
    const r3 = await createRecord(equipmentA, technician, {
      description: `${PROBE}_hist`,
      completedDate: dateAtDaysFromNow(3),
    });
    tracked.recordIds.push(r1, r2, r3);

    const within = await listMaintenanceHistory({
      q: `${PROBE}_hist`,
      from: daysFromNow(-3),
      to: daysFromNow(1),
      page: 1,
    });
    const withinIds = within.items.map((r) => r.id);
    expect(withinIds).toContain(r2);
    expect(withinIds).not.toContain(r1);
    expect(withinIds).not.toContain(r3);

    const openEnded = await listMaintenanceHistory({
      q: `${PROBE}_hist`,
      from: daysFromNow(-3),
      page: 1,
    });
    const openEndedIds = openEnded.items.map((r) => r.id);
    expect(openEndedIds).toContain(r2);
    expect(openEndedIds).not.toContain(r1);

    const openStarted = await listMaintenanceHistory({
      q: `${PROBE}_hist`,
      to: daysFromNow(1),
      page: 1,
    });
    const openStartedIds = openStarted.items.map((r) => r.id);
    expect(openStartedIds).toContain(r1);
    expect(openStartedIds).toContain(r2);
    expect(openStartedIds).not.toContain(r3);
  });

  it('filters history by equipment and technician', async () => {
    const other = await createRecord(equipmentB, supervisor, {
      description: `${PROBE}_hist`,
      completedDate: dateAtDaysFromNow(-1),
    });
    tracked.recordIds.push(other);

    const byEquipment = await listMaintenanceHistory({
      q: `${PROBE}_hist`,
      equipmentId: equipmentA,
      page: 1,
    });
    expect(byEquipment.items.every((r) => r.equipmentId === equipmentA)).toBe(
      true
    );

    const byTechnician = await listMaintenanceHistory({
      q: `${PROBE}_hist`,
      technicianId: supervisor,
      page: 1,
    });
    expect(byTechnician.items.map((r) => r.id)).toContain(other);
  });

  it('reads a record with parts used', async () => {
    const record = await getMaintenanceRecordById(tracked.recordIds[0]);
    expect(record?.equipment.id).toBe(equipmentA);
    expect(record?.technician.id).toBe(technician);
  });

  it('lists only maintenance-capable assignees', async () => {
    const assignable = await listAssignableUsers();
    const ids = assignable.map((u) => u.id);
    expect(ids).toContain(technician);
    expect(ids).toContain(supervisor);
    expect(ids).not.toContain(operator);
  });

  it('checks assignability by role', async () => {
    expect(await userCanBeAssigned(technician)).toBe(true);
    expect(await userCanBeAssigned(supervisor)).toBe(true);
    expect(await userCanBeAssigned(operator)).toBe(false);
    expect(await userCanBeAssigned('ghost-user')).toBe(false);
  });
});

describe('createMaintenanceTask action', () => {
  it('creates a scheduled task and redirects to it', async () => {
    const result = await invoke(() => createMaintenanceTask(taskFormValues({ title: `${PROBE}_created` })));
    expect(result.kind).toBe('redirect');
    const id = redirectUrl(result)!.split('/').pop()!;
    tracked.taskIds.push(id);

    const row = await prisma.maintenanceTask.findUnique({ where: { id } });
    expect(row?.status).toBe('SCHEDULED');
    expect(row?.equipmentId).toBe(equipmentA);
    expect(row?.assignedUserId).toBe(technician);
  });

  it('rejects assigning a non-maintenance user', async () => {
    const result = await invoke(() =>
      createMaintenanceTask(taskFormValues({ assignedUserId: operator }))
    );
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect(result.value.ok).toBe(false);
      expect((result.value as { error: string }).error).toContain(
        'cannot be assigned maintenance work'
      );
    }
  });

  it('rejects an equipment that no longer exists', async () => {
    const result = await invoke(() =>
      createMaintenanceTask(taskFormValues({ equipmentId: 'ghost-equipment' }))
    );
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect((result.value as { error: string }).error).toContain(
        'equipment no longer exists'
      );
    }
  });

  it('rejects a scheduled date in the past', async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const result = await invoke(() =>
      createMaintenanceTask(taskFormValues({ scheduledDate: past }))
    );
    expect(result.kind).toBe('result');
    if (result.kind === 'result' && !result.value.ok) {
      expect(result.value.fieldErrors?.scheduledDate).toBe(
        'Scheduled date cannot be in the past.'
      );
    }
  });

  it('returns field errors for other invalid input', async () => {
    const result = await invoke(() =>
      createMaintenanceTask(taskFormValues({ title: '' }))
    );
    expect(result.kind).toBe('result');
    if (result.kind === 'result' && !result.value.ok) {
      expect(result.value.fieldErrors?.title).toBe('Task title is required.');
    }
  });
});

describe('updateMaintenanceTask action', () => {
  it('updates a scheduled task', async () => {
    const id = await createTask(equipmentA, technician, { title: `${PROBE}_editable` });
    tracked.taskIds.push(id);
    const result = await invoke(() =>
      updateMaintenanceTask(id, taskFormValues({ title: `${PROBE}_edited` }))
    );
    expect(result.kind).toBe('redirect');
    const row = await prisma.maintenanceTask.findUnique({ where: { id } });
    expect(row?.title).toBe(`${PROBE}_edited`);
  });

  it('refuses to edit a completed task', async () => {
    const id = await createTask(equipmentA, technician, {
      title: `${PROBE}_done`,
      status: 'COMPLETED',
    });
    tracked.taskIds.push(id);
    const result = await invoke(() =>
      updateMaintenanceTask(id, taskFormValues({ title: `${PROBE}_nope` }))
    );
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect(result.value.ok).toBe(false);
      expect((result.value as { error: string }).error).toContain(
        'no longer schedulable'
      );
    }
  });

  it('refuses to edit a cancelled task', async () => {
    const id = await createTask(equipmentA, technician, {
      title: `${PROBE}_cancelled_edit`,
      status: 'CANCELLED',
    });
    tracked.taskIds.push(id);
    const result = await invoke(() =>
      updateMaintenanceTask(id, taskFormValues())
    );
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect(result.value.ok).toBe(false);
    }
  });
});

describe('startMaintenanceTask action', () => {
  it('starts a task assigned to the caller', async () => {
    const id = await createTask(equipmentA, technician, { title: `${PROBE}_startme` });
    tracked.taskIds.push(id);
    const result = await invoke(() => startMaintenanceTask(id));
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect(result.value.ok).toBe(true);
    }
    const row = await prisma.maintenanceTask.findUnique({ where: { id } });
    expect(row?.status).toBe('IN_PROGRESS');

    const again = await invoke(() => startMaintenanceTask(id));
    expect(again.kind).toBe('result');
    if (again.kind === 'result') {
      expect((again.value as { error: string }).error).toContain(
        'already in progress'
      );
    }
  });

  it('refuses to start a task assigned to someone else', async () => {
    const id = await createTask(equipmentA, supervisor, { title: `${PROBE}_other` });
    tracked.taskIds.push(id);
    const result = await invoke(() => startMaintenanceTask(id));
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect((result.value as { error: string }).error).toContain(
        'Only the technician assigned'
      );
    }
  });

  it('refuses to start a completed or cancelled task', async () => {
    const completed = await createTask(equipmentA, technician, {
      title: `${PROBE}_compl`,
      status: 'COMPLETED',
    });
    const cancelled = await createTask(equipmentA, technician, {
      title: `${PROBE}_cancelled`,
      status: 'CANCELLED',
    });
    tracked.taskIds.push(completed, cancelled);

    const onCompleted = await invoke(() => startMaintenanceTask(completed));
    const onCancelled = await invoke(() => startMaintenanceTask(cancelled));
    if (onCompleted.kind === 'result' && onCancelled.kind === 'result') {
      expect((onCompleted.value as { error: string }).error).toContain(
        'already been completed'
      );
      expect((onCancelled.value as { error: string }).error).toContain(
        'cancelled'
      );
    }
  });
});

describe('completeMaintenanceTask action', () => {
  const completion = (overrides: Partial<MaintenanceCompletionValues> = {}): MaintenanceCompletionValues => ({
    description: `${PROBE}_work`,
    notes: 'Replaced the pump',
    parts: [
      { name: 'Coolant Pump', quantity: 1 },
      { name: 'Seal Kit', quantity: 2 },
    ],
    ...overrides,
  });

  it('rejects completing a task that has not been started', async () => {
    const id = await createTask(equipmentA, technician, { title: `${PROBE}_notstarted` });
    tracked.taskIds.push(id);
    const result = await invoke(() => completeMaintenanceTask(id, completion()));
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect((result.value as { error: string }).error).toContain(
        'Start the task before recording its completion.'
      );
    }
  });

  it('completes a started task in a transaction and links a record', async () => {
    const id = await createTask(equipmentB, technician, { title: `${PROBE}_completing` });
    tracked.taskIds.push(id);
    await invoke(() => startMaintenanceTask(id));

    const result = await invoke(() => completeMaintenanceTask(id, completion()));
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect(result.value.ok).toBe(true);
    }

    const task = await prisma.maintenanceTask.findUnique({ where: { id } });
    expect(task?.status).toBe('COMPLETED');

    const record = await prisma.maintenanceRecord.findUnique({
      where: { taskId: id },
    });
    expect(record).not.toBeNull();
    expect(record?.equipmentId).toBe(equipmentB);
    expect(record?.technicianId).toBe(technician);
    tracked.recordIds.push(record!.id);

    const parts = await prisma.partUsed.findMany({
      where: { maintenanceRecordId: record!.id },
      orderBy: { name: 'asc' },
    });
    expect(parts.map((p) => p.name)).toEqual(['Coolant Pump', 'Seal Kit']);
    expect(parts.map((p) => p.quantity)).toEqual([1, 2]);
  });

  it('rejects a second completion', async () => {
    const id = await createTask(equipmentB, technician, { title: `${PROBE}_double` });
    tracked.taskIds.push(id);
    await invoke(() => startMaintenanceTask(id));
    await invoke(() => completeMaintenanceTask(id, completion()));

    const again = await invoke(() => completeMaintenanceTask(id, completion()));
    expect(again.kind).toBe('result');
    if (again.kind === 'result') {
      expect((again.value as { error: string }).error).toContain(
        'already been completed'
      );
    }
  });

  it('rejects completion by a user who is not the assigned technician', async () => {
    const id = await createTask(equipmentB, supervisor, { title: `${PROBE}_who` });
    tracked.taskIds.push(id);
    setSession({ id: supervisor, name: 'Supervisor', email: 'sup@test.local', role: 'SUPERVISOR' });
    await invoke(() => startMaintenanceTask(id));

    setSession({ id: technician, name: 'Technician', email: 'tech@test.local', role: 'TECHNICIAN' });
    const result = await invoke(() => completeMaintenanceTask(id, completion()));
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect((result.value as { error: string }).error).toContain(
        'Only the technician assigned'
      );
    }
  });

  it('returns field errors for invalid input', async () => {
    const result = await invoke(() =>
      completeMaintenanceTask('n/a', completion({ description: '' }))
    );
    expect(result.kind).toBe('result');
    if (result.kind === 'result' && !result.value.ok) {
      expect(result.value.fieldErrors?.description).toBe(
        'Describe the work performed.'
      );
    }
  });
});