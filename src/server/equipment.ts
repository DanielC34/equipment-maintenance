import type { Prisma } from '@prisma/client';
import type { EquipmentStatus } from '@prisma/client';
import prisma from '@/lib/prisma';

export const EQUIPMENT_PAGE_SIZE = 20;

export interface EquipmentFilter {
  q: string;
  status?: EquipmentStatus;
  page: number;
}

export async function listEquipment(filter: EquipmentFilter) {
  const page = Math.max(1, filter.page);

  const where: Prisma.EquipmentWhereInput = { deletedAt: null };
  if (filter.status) {
    where.status = filter.status;
  }
  if (filter.q) {
    where.OR = [
      { name: { contains: filter.q, mode: 'insensitive' } },
      { assetNumber: { contains: filter.q, mode: 'insensitive' } },
      { location: { contains: filter.q, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.equipment.findMany({
      where,
      include: {
        factory: { select: { id: true, name: true, location: true } },
      },
      orderBy: { name: 'asc' },
      take: EQUIPMENT_PAGE_SIZE,
      skip: (page - 1) * EQUIPMENT_PAGE_SIZE,
    }),
    prisma.equipment.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize: EQUIPMENT_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / EQUIPMENT_PAGE_SIZE)),
  };
}

export async function getEquipmentById(id: string) {
  return prisma.equipment.findUnique({
    where: { id },
    include: { factory: true },
  });
}

export async function listFactories() {
  return prisma.factory.findMany({
    select: { id: true, name: true, location: true },
    orderBy: { name: 'asc' },
  });
}
