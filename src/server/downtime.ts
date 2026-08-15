import type { Prisma } from '@prisma/client';
import type { DowntimeStatus } from '@prisma/client';
import prisma from '@/lib/prisma';

export const DOWNTIME_PAGE_SIZE = 20;

export interface DowntimeFilter {
  q: string;
  equipmentId?: string;
  status?: DowntimeStatus;
  from?: string;
  to?: string;
  page: number;
}

export async function listDowntimeEvents(filter: DowntimeFilter) {
  const page = Math.max(1, filter.page);

  const where: Prisma.DowntimeEventWhereInput = {};
  if (filter.equipmentId) {
    where.equipmentId = filter.equipmentId;
  }
  if (filter.status) {
    where.status = filter.status;
  }

  const startedAt: Prisma.DateTimeFilter = {};
  if (filter.from) {
    const from = new Date(filter.from);
    if (!Number.isNaN(from.getTime())) {
      startedAt.gte = from;
    }
  }
  if (filter.to) {
    const to = new Date(filter.to);
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      startedAt.lte = to;
    }
  }
  if (filter.from || filter.to) {
    where.startedAt = startedAt;
  }

  if (filter.q) {
    const q = filter.q;
    where.OR = [
      { equipment: { name: { contains: q, mode: 'insensitive' } } },
      { equipment: { assetNumber: { contains: q, mode: 'insensitive' } } },
      { reportedBy: { name: { contains: q, mode: 'insensitive' } } },
      { notes: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.downtimeEvent.findMany({
      where,
      include: {
        equipment: {
          select: { id: true, name: true, assetNumber: true },
        },
        reportedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
      take: DOWNTIME_PAGE_SIZE,
      skip: (page - 1) * DOWNTIME_PAGE_SIZE,
    }),
    prisma.downtimeEvent.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize: DOWNTIME_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / DOWNTIME_PAGE_SIZE)),
  };
}

export async function getDowntimeEventById(id: string) {
  return prisma.downtimeEvent.findUnique({
    where: { id },
    include: {
      equipment: {
        select: {
          id: true,
          name: true,
          assetNumber: true,
          location: true,
          status: true,
          factory: { select: { id: true, name: true, location: true } },
        },
      },
      reportedBy: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });
}

export async function getEquipmentDowntimeHistory(
  equipmentId: string,
  page: number,
  q = ''
) {
  return listDowntimeEvents({ q, equipmentId, page });
}

export function downtimeDurationMinutes(event: {
  startedAt: Date;
  endedAt: Date | null;
}): number | null {
  if (!event.endedAt) {
    return null;
  }
  const minutes = Math.max(
    0,
    Math.round(
      (event.endedAt.getTime() - event.startedAt.getTime()) / 60000
    )
  );
  return minutes;
}

export function formatDowntimeDuration(minutes: number | null): string {
  if (minutes === null) {
    return 'Ongoing';
  }
  if (minutes === 0) {
    return '0m';
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}