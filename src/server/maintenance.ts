import type { Prisma } from '@prisma/client';
import type {
  MaintenanceStatus,
  Priority,
  Role,
} from '@prisma/client';
import prisma from '@/lib/prisma';
import { PERMISSIONS, roleHasPermission } from '@/lib/permissions';

export const MAINTENANCE_PAGE_SIZE = 20;

export interface MaintenanceFilter {
  q: string;
  status?: MaintenanceStatus;
  priority?: Priority;
  page: number;
}

export const MAINTENANCE_HISTORY_PAGE_SIZE = 20;

export interface MaintenanceHistoryFilter {
  q: string;
  equipmentId?: string;
  technicianId?: string;
  from?: string;
  to?: string;
  page: number;
}

export async function listMaintenanceHistory(
  filter: MaintenanceHistoryFilter
) {
  const page = Math.max(1, filter.page);

  const where: Prisma.MaintenanceRecordWhereInput = {};
  if (filter.equipmentId) {
    where.equipmentId = filter.equipmentId;
  }
  if (filter.technicianId) {
    where.technicianId = filter.technicianId;
  }

  const completedDate: Prisma.DateTimeFilter = {};
  if (filter.from) {
    const from = new Date(filter.from);
    if (!Number.isNaN(from.getTime())) {
      completedDate.gte = from;
    }
  }
  if (filter.to) {
    const to = new Date(filter.to);
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      completedDate.lte = to;
    }
  }
  if (filter.from || filter.to) {
    where.completedDate = completedDate;
  }

  if (filter.q) {
    const q = filter.q;
    where.OR = [
      { description: { contains: q, mode: 'insensitive' } },
      { notes: { contains: q, mode: 'insensitive' } },
      { equipment: { name: { contains: q, mode: 'insensitive' } } },
      { equipment: { assetNumber: { contains: q, mode: 'insensitive' } } },
      { technician: { name: { contains: q, mode: 'insensitive' } } },
      { task: { title: { contains: q, mode: 'insensitive' } } },
      { task: { description: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.maintenanceRecord.findMany({
      where,
      include: {
        equipment: {
          select: { id: true, name: true, assetNumber: true },
        },
        technician: {
          select: { id: true, name: true, email: true, role: true },
        },
        task: {
          select: {
            id: true,
            title: true,
            priority: true,
            status: true,
            scheduledDate: true,
          },
        },
        _count: { select: { partsUsed: true } },
      },
      orderBy: [{ completedDate: 'desc' }, { createdAt: 'desc' }],
      take: MAINTENANCE_HISTORY_PAGE_SIZE,
      skip: (page - 1) * MAINTENANCE_HISTORY_PAGE_SIZE,
    }),
    prisma.maintenanceRecord.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize: MAINTENANCE_HISTORY_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / MAINTENANCE_HISTORY_PAGE_SIZE)),
  };
}

export async function getMaintenanceRecordById(id: string) {
  return prisma.maintenanceRecord.findUnique({
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
      technician: {
        select: { id: true, name: true, email: true, role: true },
      },
      task: {
        select: {
          id: true,
          title: true,
          description: true,
          priority: true,
          status: true,
          scheduledDate: true,
        },
      },
      partsUsed: { orderBy: { name: 'asc' } },
    },
  });
}

export async function getEquipmentMaintenanceHistory(
  equipmentId: string,
  page: number,
  q = ''
) {
  return listMaintenanceHistory({ q, equipmentId, page });
}

export async function listMaintenanceTasks(filter: MaintenanceFilter) {
  const page = Math.max(1, filter.page);

  const where: Prisma.MaintenanceTaskWhereInput = {};
  if (filter.status) {
    where.status = filter.status;
  }
  if (filter.priority) {
    where.priority = filter.priority;
  }
  if (filter.q) {
    where.OR = [
      { title: { contains: filter.q, mode: 'insensitive' } },
      { description: { contains: filter.q, mode: 'insensitive' } },
      { equipment: { name: { contains: filter.q, mode: 'insensitive' } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.maintenanceTask.findMany({
      where,
      include: {
        equipment: {
          select: { id: true, name: true, assetNumber: true, location: true },
        },
        assignedUser: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'asc' }],
      take: MAINTENANCE_PAGE_SIZE,
      skip: (page - 1) * MAINTENANCE_PAGE_SIZE,
    }),
    prisma.maintenanceTask.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize: MAINTENANCE_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / MAINTENANCE_PAGE_SIZE)),
  };
}

export async function getMaintenanceTaskById(id: string) {
  return prisma.maintenanceTask.findUnique({
    where: { id },
    include: {
      equipment: {
        select: {
          id: true,
          name: true,
          assetNumber: true,
          location: true,
          status: true,
          factory: { select: { id: true, name: true } },
        },
      },
      assignedUser: {
        select: { id: true, name: true, email: true, role: true },
      },
      maintenanceRecord: {
        include: {
          technician: {
            select: { id: true, name: true, email: true, role: true },
          },
          partsUsed: true,
        },
      },
    },
  });
}

export async function listEquipmentsForSelect() {
  return prisma.equipment.findMany({
    select: { id: true, name: true, assetNumber: true },
    orderBy: { name: 'asc' },
  });
}

export async function listAssignableUsers() {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  });
  return users.filter((user) =>
    roleHasPermission(user.role as Role, PERMISSIONS.maintenanceComplete)
  );
}

export async function userCanBeAssigned(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, active: true },
  });
  if (!user || !user.active) {
    return false;
  }
  return roleHasPermission(user.role as Role, PERMISSIONS.maintenanceComplete);
}