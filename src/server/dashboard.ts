import type {
  EquipmentStatus,
  MaintenanceStatus,
  DowntimeReason,
  Priority,
} from '@prisma/client';
import prisma from '@/lib/prisma';
import { getCached, setCached, CACHE_KEYS } from '@/lib/cache';
import { downtimeDurationMinutes } from '@/server/downtime';

export const DASHBOARD_LIST_LIMIT = 5;

const EQUIPMENT_START = {
  OPERATIONAL: 0,
  UNDER_MAINTENANCE: 0,
  OFFLINE: 0,
} as const satisfies Record<EquipmentStatus, number>;

const MAINTENANCE_START = {
  SCHEDULED: 0,
  IN_PROGRESS: 0,
  COMPLETED: 0,
  CANCELLED: 0,
} as const satisfies Record<MaintenanceStatus, number>;

export async function getEquipmentStatusCounts(): Promise<
  Record<EquipmentStatus, number>
> {
  const rows = await prisma.equipment.groupBy({
    by: ['status'],
    where: { deletedAt: null },
    _count: { _all: true },
  });
  const counts = { ...EQUIPMENT_START } as Record<EquipmentStatus, number>;
  for (const row of rows) {
    counts[row.status] = row._count._all;
  }
  return counts;
}

export async function getEquipmentTotal(): Promise<number> {
  return prisma.equipment.count({ where: { deletedAt: null } });
}

export async function getMaintenanceStatusCounts(): Promise<
  Record<MaintenanceStatus, number>
> {
  const rows = await prisma.maintenanceTask.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  const counts = { ...MAINTENANCE_START } as Record<MaintenanceStatus, number>;
  for (const row of rows) {
    counts[row.status] = row._count._all;
  }
  return counts;
}

export async function getOverdueTaskCount(): Promise<number> {
  return prisma.maintenanceTask.count({
    where: {
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      scheduledDate: { lt: new Date() },
    },
  });
}

export async function getOpenDowntimeCount(): Promise<number> {
  return prisma.downtimeEvent.count({ where: { status: 'OPEN' } });
}

export async function getUpcomingTasks(limit = DASHBOARD_LIST_LIMIT) {
  return prisma.maintenanceTask.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledDate: { gte: new Date() },
    },
    include: {
      equipment: { select: { id: true, name: true, assetNumber: true } },
      assignedUser: { select: { id: true, name: true } },
    },
    orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'asc' }],
    take: limit,
  });
}

export async function getRecentMaintenanceRecords(
  limit = DASHBOARD_LIST_LIMIT
) {
  return prisma.maintenanceRecord.findMany({
    include: {
      equipment: { select: { id: true, name: true, assetNumber: true } },
      technician: { select: { id: true, name: true } },
    },
    orderBy: { completedDate: 'desc' },
    take: limit,
  });
}

export async function getOpenDowntimeEvents(limit = DASHBOARD_LIST_LIMIT) {
  return prisma.downtimeEvent.findMany({
    where: { status: 'OPEN' },
    include: {
      equipment: { select: { id: true, name: true, assetNumber: true } },
    },
    orderBy: { startedAt: 'desc' },
    take: limit,
  });
}

export async function getRecentDowntimeEvents(limit = DASHBOARD_LIST_LIMIT) {
  return prisma.downtimeEvent.findMany({
    include: {
      equipment: { select: { id: true, name: true, assetNumber: true } },
    },
    orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });
}

export interface DowntimeTotals {
  resolvedCount: number;
  totalMinutes: number;
  mttrMinutes: number | null;
}

export async function getDowntimeTotals(): Promise<DowntimeTotals> {
  const resolved = await prisma.downtimeEvent.findMany({
    where: { status: 'RESOLVED' },
    select: { startedAt: true, endedAt: true },
  });
  const durations = resolved
    .map((event) => downtimeDurationMinutes(event))
    .filter((minutes): minutes is number => minutes !== null);
  const totalMinutes = durations.reduce((sum, minutes) => sum + minutes, 0);
  const resolvedCount = durations.length;
  return {
    resolvedCount,
    totalMinutes,
    mttrMinutes:
      resolvedCount > 0 ? Math.round(totalMinutes / resolvedCount) : null,
  };
}

export interface DowntimeReasonRow {
  reason: DowntimeReason;
  count: number;
}

export async function getDowntimeByReason(): Promise<DowntimeReasonRow[]> {
  const rows = await prisma.downtimeEvent.groupBy({
    by: ['reason'],
    _count: { _all: true },
  });
  return rows
    .map((row) => ({ reason: row.reason, count: row._count._all }))
    .sort((a, b) => b.count - a.count);
}

export interface DashboardAggregates {
  equipmentTotal: number;
  equipmentByStatus: Record<EquipmentStatus, number>;
  maintenanceByStatus: Record<MaintenanceStatus, number>;
  overdueTasks: number;
  openDowntime: number;
  downtimeTotals: DowntimeTotals;
  downtimeByReason: DowntimeReasonRow[];
}

/** Fast, cache-friendly subset of the dashboard (no Date-typed rows). */
export async function getDashboardAggregates(): Promise<DashboardAggregates> {
  const cached = await getCached<DashboardAggregates>(
    CACHE_KEYS.dashboardAggregates
  );
  if (cached) return cached;

  const computed = await computeDashboardAggregates();
  await setCached(CACHE_KEYS.dashboardAggregates, computed);
  return computed;
}

async function computeDashboardAggregates(): Promise<DashboardAggregates> {
  const [
    equipmentTotal,
    equipmentByStatus,
    maintenanceByStatus,
    overdueTasks,
    openDowntime,
    downtimeTotals,
    downtimeByReason,
  ] = await Promise.all([
    getEquipmentTotal(),
    getEquipmentStatusCounts(),
    getMaintenanceStatusCounts(),
    getOverdueTaskCount(),
    getOpenDowntimeCount(),
    getDowntimeTotals(),
    getDowntimeByReason(),
  ]);

  return {
    equipmentTotal,
    equipmentByStatus,
    maintenanceByStatus,
    overdueTasks,
    openDowntime,
    downtimeTotals,
    downtimeByReason,
  };
}

export interface DashboardOverview {
  equipmentTotal: number;
  equipmentByStatus: Record<EquipmentStatus, number>;
  maintenanceByStatus: Record<MaintenanceStatus, number>;
  overdueTasks: number;
  openDowntime: number;
  upcomingTasks: Awaited<ReturnType<typeof getUpcomingTasks>>;
  recentRecords: Awaited<ReturnType<typeof getRecentMaintenanceRecords>>;
  openDowntimeEvents: Awaited<ReturnType<typeof getOpenDowntimeEvents>>;
  recentDowntimeEvents: Awaited<ReturnType<typeof getRecentDowntimeEvents>>;
  downtimeTotals: DowntimeTotals;
  downtimeByReason: DowntimeReasonRow[];
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const [aggregates, upcomingTasks, recentRecords, openDowntimeEvents, recentDowntimeEvents] =
    await Promise.all([
      getDashboardAggregates(),
      getUpcomingTasks(),
      getRecentMaintenanceRecords(),
      getOpenDowntimeEvents(),
      getRecentDowntimeEvents(),
    ]);

  return {
    ...aggregates,
    upcomingTasks,
    recentRecords,
    openDowntimeEvents,
    recentDowntimeEvents,
  };
}

export type {
  EquipmentStatus,
  MaintenanceStatus,
  DowntimeReason,
  Priority,
};