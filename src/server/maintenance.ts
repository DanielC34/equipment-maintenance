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
    select: { id: true, role: true },
  });
  if (!user) {
    return false;
  }
  return roleHasPermission(user.role as Role, PERMISSIONS.maintenanceComplete);
}