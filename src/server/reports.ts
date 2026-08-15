import type { Prisma, DowntimeReason } from '@prisma/client';
import prisma from '@/lib/prisma';
import { downtimeDurationMinutes } from '@/server/downtime';

export interface ReportFilter {
  from?: string;
  to?: string;
}

function dateRange(
  from?: string,
  to?: string
): { gte?: Date; lte?: Date } | undefined {
  const range: { gte?: Date; lte?: Date } = {};
  if (from) {
    const start = new Date(from);
    if (!Number.isNaN(start.getTime())) {
      range.gte = start;
    }
  }
  if (to) {
    const end = new Date(to);
    if (!Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }
  }
  if (!range.gte && !range.lte) {
    return undefined;
  }
  return range;
}

export interface MaintenanceReport {
  totalRecords: number;
  byTechnician: { name: string; count: number }[];
  byEquipment: { name: string; count: number }[];
  totalParts: number;
}

export async function getMaintenanceReport(
  filter: ReportFilter
): Promise<MaintenanceReport> {
  const range = dateRange(filter.from, filter.to);
  const where: Prisma.MaintenanceRecordWhereInput = range
    ? { completedDate: range }
    : {};

  const [byTechnician, byEquipment, partsAgg] = await Promise.all([
    prisma.maintenanceRecord.groupBy({
      by: ['technicianId'],
      where,
      _count: { _all: true },
    }),
    prisma.maintenanceRecord.groupBy({
      by: ['equipmentId'],
      where,
      _count: { _all: true },
    }),
    prisma.partUsed.aggregate({
      _sum: { quantity: true },
      where: {
        maintenanceRecord: range ? { completedDate: range } : undefined,
      },
    }),
  ]);

  const [technicians, equipments, totalRecords] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: byTechnician.map((r) => r.technicianId) } },
      select: { id: true, name: true },
    }),
    prisma.equipment.findMany({
      where: { id: { in: byEquipment.map((r) => r.equipmentId) } },
      select: { id: true, name: true },
    }),
    prisma.maintenanceRecord.count({ where }),
  ]);

  const techNames = new Map(technicians.map((u) => [u.id, u.name]));
  const equipNames = new Map(equipments.map((e) => [e.id, e.name]));

  return {
    totalRecords,
    byTechnician: byTechnician
      .map((r) => ({
        name: techNames.get(r.technicianId) ?? 'Unknown',
        count: r._count._all,
      }))
      .sort((a, b) => b.count - a.count),
    byEquipment: byEquipment
      .map((r) => ({
        name: equipNames.get(r.equipmentId) ?? 'Unknown',
        count: r._count._all,
      }))
      .sort((a, b) => b.count - a.count),
    totalParts: partsAgg._sum.quantity ?? 0,
  };
}

export interface DowntimeReport {
  totalEvents: number;
  open: number;
  resolved: number;
  totalMinutes: number;
  byReason: { reason: DowntimeReason; count: number; minutes: number }[];
}

export async function getDowntimeReport(
  filter: ReportFilter
): Promise<DowntimeReport> {
  const range = dateRange(filter.from, filter.to);
  const where: Prisma.DowntimeEventWhereInput = range
    ? { startedAt: range }
    : {};

  const events = await prisma.downtimeEvent.findMany({
    where,
    select: {
      status: true,
      startedAt: true,
      endedAt: true,
      reason: true,
    },
  });

  const reasonTotals = new Map<
    DowntimeReason,
    { count: number; minutes: number }
  >();
  let open = 0;
  let resolved = 0;
  let totalMinutes = 0;

  for (const event of events) {
    if (event.status === 'OPEN') {
      open += 1;
    } else {
      resolved += 1;
      const minutes = downtimeDurationMinutes(event);
      if (minutes !== null) {
        totalMinutes += minutes;
      }
    }
    const current = reasonTotals.get(event.reason) ?? {
      count: 0,
      minutes: 0,
    };
    current.count += 1;
    if (event.endedAt) {
      const minutes = downtimeDurationMinutes(event);
      if (minutes !== null) {
        current.minutes += minutes;
      }
    }
    reasonTotals.set(event.reason, current);
  }

  return {
    totalEvents: events.length,
    open,
    resolved,
    totalMinutes,
    byReason: Array.from(reasonTotals.entries())
      .map(([reason, { count, minutes }]) => ({ reason, count, minutes }))
      .sort((a, b) => b.count - a.count || b.minutes - a.minutes),
  };
}