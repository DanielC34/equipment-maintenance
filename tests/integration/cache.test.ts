import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '@/lib/prisma';
import { setSession, invoke, type ActionResult } from './mocks';
import {
  getDashboardAggregates,
  type DashboardAggregates,
} from '@/server/dashboard';
import {
  getMaintenanceReport,
  getDowntimeReport,
  type MaintenanceReport,
  type DowntimeReport,
} from '@/server/reports';
import {
  getCached,
  setCached,
  invalidateAggregateCaches,
  CACHE_KEYS,
} from '@/lib/cache';
import {
  recordDowntimeEvent,
} from '@/server/actions/downtime';
import type { DowntimeEventFormValues } from '@/lib/validations';
import {
  cleanup,
  createFactory,
  createUser,
  createEquipment as createEquipmentRow,
  createDowntime,
} from './fixtures';

const PROBE = 'probe_cache';

const tracked = {
  factoryIds: [] as string[],
  userIds: [] as string[],
  equipmentIds: [] as string[],
  downtimeIds: [] as string[],
};

let operator: string;
let equipment: string;

function redirectUrl(result: ActionResult<unknown>): string | undefined {
  return result.kind === 'redirect' ? result.url : undefined;
}

function formValues(
  overrides: Partial<DowntimeEventFormValues> = {}
): DowntimeEventFormValues {
  return {
    equipmentId: equipment,
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    endedAt: '',
    reason: 'ELECTRICAL',
    notes: 'Cache probe downtime',
    ...overrides,
  };
}

beforeAll(async () => {
  await invalidateAggregateCaches();

  tracked.factoryIds.push(await createFactory(`${PROBE}_factory`));
  operator = await createUser('OPERATOR', `${PROBE}_op`);
  tracked.userIds.push(operator);

  equipment = await createEquipmentRow(tracked.factoryIds[0], {
    name: `${PROBE}_equip`,
    assetNumber: `${PROBE}_asset`,
  });
  tracked.equipmentIds.push(equipment);

  const seeded = await createDowntime(equipment, operator, {
    startedAt: new Date(Date.now() - 3600000),
    endedAt: null,
    status: 'OPEN',
    reason: 'MECHANICAL',
  });
  tracked.downtimeIds.push(seeded);
});

afterAll(async () => {
  await invalidateAggregateCaches();
  await cleanup(tracked);
  await prisma.$disconnect();
});

describe('dashboard aggregates caching', () => {
  it('serves a primed cache value and recomputes after invalidation', async () => {
    const live = await getDashboardAggregates();

    const stale: DashboardAggregates = {
      equipmentTotal: 987654,
      equipmentByStatus: { OPERATIONAL: 0, UNDER_MAINTENANCE: 0, OFFLINE: 0 },
      maintenanceByStatus: {
        SCHEDULED: 0,
        IN_PROGRESS: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      },
      overdueTasks: 0,
      openDowntime: 0,
      downtimeTotals: { resolvedCount: 0, totalMinutes: 0, mttrMinutes: null },
      downtimeByReason: [],
    };
    await setCached(CACHE_KEYS.dashboardAggregates, stale);

    expect((await getDashboardAggregates()).equipmentTotal).toBe(987654);

    await invalidateAggregateCaches();

    const refreshed = await getDashboardAggregates();
    expect(refreshed.equipmentTotal).toBe(live.equipmentTotal);
    expect(refreshed.openDowntime).toBe(live.openDowntime);
  });
});

describe('report caching boundaries', () => {
  it('caches unfiltered reports but recomputes filtered ones live', async () => {
    const liveMaintenance = await getMaintenanceReport({});
    const staleMaintenance: MaintenanceReport = {
      totalRecords: 999,
      byTechnician: [],
      byEquipment: [],
      totalParts: -1,
    };
    await setCached(CACHE_KEYS.reportsMaintenance, staleMaintenance);

    expect((await getMaintenanceReport({})).totalRecords).toBe(999);
    const filteredMaintenance = await getMaintenanceReport({
      from: '2026-01-01',
    });
    expect(filteredMaintenance.totalRecords).toBe(liveMaintenance.totalRecords);
    // Filtered result must not have replaced the cached unfiltered value.
    expect(await getCached(CACHE_KEYS.reportsMaintenance)).toEqual(
      staleMaintenance
    );

    const liveDowntime = await getDowntimeReport({});
    const staleDowntime: DowntimeReport = {
      totalEvents: 777,
      open: 0,
      resolved: 0,
      totalMinutes: 0,
      byReason: [],
    };
    await setCached(CACHE_KEYS.reportsDowntime, staleDowntime);

    expect((await getDowntimeReport({})).totalEvents).toBe(777);
    const filteredDowntime = await getDowntimeReport({ from: '2026-01-01' });
    expect(filteredDowntime.totalEvents).toBe(liveDowntime.totalEvents);
    expect(await getCached(CACHE_KEYS.reportsDowntime)).toEqual(
      staleDowntime
    );
  });
});

describe('mutation invalidation', () => {
  it('serves stale data until a mutating action invalidates the cache', async () => {
    await invalidateAggregateCaches();
    const baseline = (await getDowntimeReport({})).totalEvents;

    // A direct data change outside the action layer leaves the cache untouched.
    await createDowntime(equipment, operator, {
      startedAt: new Date(Date.now() - 1800000),
      endedAt: null,
      status: 'OPEN',
      reason: 'HYDRAULIC',
    });
    expect((await getDowntimeReport({})).totalEvents).toBe(baseline);

    // The real server action invalidates aggregates, so the next read is fresh.
    setSession({
      id: operator,
      name: 'Operator',
      email: 'op@local.test',
      role: 'OPERATOR',
    });
    const outcome = await invoke(() =>
      recordDowntimeEvent(
        formValues({
          startedAt: new Date(Date.now() - 900000).toISOString(),
        })
      )
    );
    expect(outcome.kind).toBe('redirect');
    const id = redirectUrl(outcome)!.split('/').pop()!;
    tracked.downtimeIds.push(id);

    expect((await getDowntimeReport({})).totalEvents).toBe(baseline + 2);
  });

  it('keeps dashboard aggregates fresh after the same action', async () => {
    await invalidateAggregateCaches();
    const baselineOpen = (await getDashboardAggregates()).openDowntime;

    setSession({
      id: operator,
      name: 'Operator',
      email: 'op@local.test',
      role: 'OPERATOR',
    });
    const outcome = await invoke(() =>
      recordDowntimeEvent(
        formValues({
          startedAt: new Date(Date.now() - 450000).toISOString(),
        })
      )
    );
    expect(outcome.kind).toBe('redirect');
    const id = redirectUrl(outcome)!.split('/').pop()!;
    tracked.downtimeIds.push(id);

    expect((await getDashboardAggregates()).openDowntime).toBe(
      baselineOpen + 1
    );
    expect((await getDowntimeReport({})).totalEvents).toBeGreaterThanOrEqual(
      baselineOpen + 1
    );
  });
});