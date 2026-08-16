import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '@/lib/prisma';
import { setSession, invoke, type ActionResult } from './mocks';
import {
  listDowntimeEvents,
  getDowntimeEventById,
  getEquipmentDowntimeHistory,
} from '@/server/downtime';
import {
  recordDowntimeEvent,
  resolveDowntimeEvent,
} from '@/server/actions/downtime';
import type { DowntimeEventFormValues } from '@/lib/validations';
import {
  cleanup,
  createFactory,
  createUser,
  createEquipment as createEquipmentRow,
  createDowntime,
  dateAtDaysFromNow,
  daysFromNow,
} from './fixtures';

const PROBE = 'probe_downtime';

const tracked = {
  factoryIds: [] as string[],
  userIds: [] as string[],
  equipmentIds: [] as string[],
  downtimeIds: [] as string[],
};

let operator: string;
let technician: string;
let equipmentX: string;
let equipmentY: string;

function redirectUrl(result: ActionResult<unknown>): string | undefined {
  return result.kind === 'redirect' ? result.url : undefined;
}

function formValues(
  overrides: Partial<DowntimeEventFormValues> = {}
): DowntimeEventFormValues {
  return {
    equipmentId: equipmentX,
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    endedAt: '',
    reason: 'MECHANICAL',
    notes: 'Probe downtime',
    ...overrides,
  };
}

afterAll(async () => {
  await cleanup(tracked);
  await prisma.$disconnect();
});

beforeAll(async () => {
  tracked.factoryIds.push(await createFactory(`${PROBE}_factory`));
  operator = await createUser('OPERATOR', `${PROBE}_op`);
  technician = await createUser('TECHNICIAN', `${PROBE}_tech`);
  tracked.userIds.push(operator, technician);

  equipmentX = await createEquipmentRow(tracked.factoryIds[0], {
    name: `${PROBE}_equip_x`,
    assetNumber: `${PROBE}_asset_x`,
  });
  equipmentY = await createEquipmentRow(tracked.factoryIds[0], {
    name: `${PROBE}_equip_y`,
    assetNumber: `${PROBE}_asset_y`,
  });
  tracked.equipmentIds.push(equipmentX, equipmentY);
});

describe('downtime data layer', () => {
  it('lists events newest-first and filters by from/to', async () => {
    const oldResolved = await createDowntime(equipmentX, operator, {
      startedAt: dateAtDaysFromNow(-4),
      endedAt: new Date(dateAtDaysFromNow(-4).getTime() + 3600000),
      status: 'RESOLVED',
      reason: 'ELECTRICAL',
    });
    const midOpen = await createDowntime(equipmentX, operator, {
      startedAt: dateAtDaysFromNow(-2),
      endedAt: null,
      status: 'OPEN',
      reason: 'HYDRAULIC',
    });
    const futureResolved = await createDowntime(equipmentX, operator, {
      startedAt: dateAtDaysFromNow(3),
      endedAt: new Date(dateAtDaysFromNow(3).getTime() + 3600000),
      status: 'RESOLVED',
      reason: 'MECHANICAL',
    });
    tracked.downtimeIds.push(oldResolved, midOpen, futureResolved);

    const all = await listDowntimeEvents({ q: `${PROBE}_equip`, page: 1 });
    const order = all.items.map((e) => e.id);
    expect(order).toEqual([futureResolved, midOpen, oldResolved]);
    expect(all.total).toBe(3);

    const fromLastThreeDays = await listDowntimeEvents({
      q: `${PROBE}_equip`,
      from: daysFromNow(-3),
      page: 1,
    });
    const ids = fromLastThreeDays.items.map((e) => e.id);
    expect(ids).toContain(midOpen);
    expect(ids).toContain(futureResolved);
    expect(ids).not.toContain(oldResolved);

    const upToTomorrow = await listDowntimeEvents({
      q: `${PROBE}_equip`,
      to: daysFromNow(1),
      page: 1,
    });
    const ids2 = upToTomorrow.items.map((e) => e.id);
    expect(ids2).toContain(oldResolved);
    expect(ids2).toContain(midOpen);
    expect(ids2).not.toContain(futureResolved);
  });

  it('filters by status and equipment', async () => {
    const open = await createDowntime(equipmentY, operator, {
      startedAt: dateAtDaysFromNow(-1),
      endedAt: null,
      status: 'OPEN',
    });
    const resolved = await createDowntime(equipmentX, operator, {
      startedAt: dateAtDaysFromNow(-1),
      endedAt: new Date(dateAtDaysFromNow(-1).getTime() + 1800000),
      status: 'RESOLVED',
    });
    tracked.downtimeIds.push(open, resolved);

    const openOnly = await listDowntimeEvents({
      q: `${PROBE}_equip`,
      status: 'OPEN',
      page: 1,
    });
    expect(openOnly.items.some((e) => e.id === open)).toBe(true);
    expect(openOnly.items.every((e) => e.status === 'OPEN')).toBe(true);

    const byEquipment = await listDowntimeEvents({
      q: `${PROBE}_equip`,
      equipmentId: equipmentY,
      page: 1,
    });
    expect(byEquipment.items.map((e) => e.id)).toContain(open);
    expect(byEquipment.items.every((e) => e.equipmentId === equipmentY)).toBe(
      true
    );
  });

  it('searches by reporter name', async () => {
    const found = await listDowntimeEvents({ q: `${PROBE}_op`, page: 1 });
    expect(found.items.length).toBeGreaterThan(0);
  });

  it('reads an event with its relations and equipment-scoped history', async () => {
    const event = await getDowntimeEventById(tracked.downtimeIds[0]);
    expect(event?.equipment.name).toContain(PROBE);
    expect(event?.reportedBy.id).toBe(operator);

    const history = await getEquipmentDowntimeHistory(equipmentX, 1);
    expect(history.items.every((e) => e.equipmentId === equipmentX)).toBe(true);
  });
});

describe('recordDowntimeEvent action', () => {
  beforeAll(() => {
    setSession({ id: operator, name: 'Operator', email: 'op@test.local', role: 'OPERATOR' });
  });

  it('records an OPEN event and redirects', async () => {
    const result = await invoke(() =>
      recordDowntimeEvent(formValues({ reason: 'MECHANICAL' }))
    );
    expect(result.kind).toBe('redirect');
    const id = redirectUrl(result)!.split('/').pop()!;
    tracked.downtimeIds.push(id);

    const row = await prisma.downtimeEvent.findUnique({ where: { id } });
    expect(row?.status).toBe('OPEN');
    expect(row?.endedAt).toBeNull();
    expect(row?.reportedById).toBe(operator);
  });

  it('records a RESOLVED event when an end time is provided', async () => {
    const startedAt = new Date(Date.now() - 3600000).toISOString();
    const result = await invoke(() =>
      recordDowntimeEvent(
        formValues({
          startedAt,
          endedAt: new Date(Date.now()).toISOString(),
        })
      )
    );
    expect(result.kind).toBe('redirect');
    const id = redirectUrl(result)!.split('/').pop()!;
    tracked.downtimeIds.push(id);

    const row = await prisma.downtimeEvent.findUnique({ where: { id } });
    expect(row?.status).toBe('RESOLVED');
    expect(row?.endedAt).not.toBeNull();
  });

  it('rejects an end before the start with the crossed-times message', async () => {
    const startedAt = new Date(Date.now()).toISOString();
    const result = await invoke(() =>
      recordDowntimeEvent(
        formValues({
          startedAt,
          endedAt: new Date(Date.now() - 3600000).toISOString(),
        })
      )
    );
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect(result.value).toEqual({
        ok: false,
        error: 'End date/time must be after the start date/time.',
        fieldErrors: { endedAt: 'Must be after the start time.' },
      });
    }
  });

  it('rejects a missing equipment', async () => {
    const result = await invoke(() =>
      recordDowntimeEvent(formValues({ equipmentId: 'ghost-equipment' }))
    );
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect((result.value as { error: string }).error).toContain(
        'equipment no longer exists'
      );
    }
  });

  it('returns field errors for invalid input', async () => {
    const result = await invoke(() =>
      recordDowntimeEvent(
        formValues({ startedAt: '', equipmentId: '', reason: 'SOLAR' as never })
      )
    );
    expect(result.kind).toBe('result');
    if (result.kind === 'result' && !result.value.ok) {
      expect(result.value.fieldErrors?.startedAt).toBe(
        'Select a start date and time.'
      );
      expect(result.value.fieldErrors?.equipmentId).toBe(
        'Select the equipment.'
      );
      expect(result.value.fieldErrors?.reason).toBe('Select a reason.');
    }
  });
});

describe('resolveDowntimeEvent action', () => {
  beforeAll(() => {
    setSession({ id: technician, name: 'Technician', email: 'tech@test.local', role: 'TECHNICIAN' });
  });

  it('resolves an open event', async () => {
    const id = await createDowntime(equipmentX, operator, {
      startedAt: dateAtDaysFromNow(0),
      endedAt: null,
      status: 'OPEN',
    });
    tracked.downtimeIds.push(id);

    const result = await invoke(() =>
      resolveDowntimeEvent(id, { endedAt: new Date(Date.now()).toISOString() })
    );
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect(result.value.ok).toBe(true);
    }

    const row = await prisma.downtimeEvent.findUnique({ where: { id } });
    expect(row?.status).toBe('RESOLVED');
    expect(row?.endedAt).not.toBeNull();
  });

  it('refuses to resolve an already resolved event', async () => {
    const id = await createDowntime(equipmentX, operator, {
      startedAt: dateAtDaysFromNow(-1),
      endedAt: new Date(dateAtDaysFromNow(-1).getTime() + 3600000),
      status: 'RESOLVED',
    });
    tracked.downtimeIds.push(id);

    const result = await invoke(() =>
      resolveDowntimeEvent(id, { endedAt: new Date(Date.now()).toISOString() })
    );
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect((result.value as { error: string }).error).toContain(
        'already been resolved'
      );
    }
  });

  it('rejects an end time before the opened time', async () => {
    const startedAt = dateAtDaysFromNow(0);
    const id = await createDowntime(equipmentX, operator, {
      startedAt,
      endedAt: null,
      status: 'OPEN',
    });
    tracked.downtimeIds.push(id);

    const result = await invoke(() =>
      resolveDowntimeEvent(id, {
        endedAt: new Date(startedAt.getTime() - 3600000).toISOString(),
      })
    );
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect(result.value).toEqual({
        ok: false,
        error: 'End date/time must be after the start date/time.',
        fieldErrors: { endedAt: 'Must be after the start time.' },
      });
    }
  });

  it('reports an event that no longer exists', async () => {
    const result = await invoke(() =>
      resolveDowntimeEvent('ghost-event', {
        endedAt: new Date(Date.now()).toISOString(),
      })
    );
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect((result.value as { error: string }).error).toBe(
        'This downtime event no longer exists.'
      );
    }
  });
});