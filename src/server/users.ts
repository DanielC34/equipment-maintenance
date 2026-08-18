import type { Prisma, Role } from '@prisma/client';
import prisma from '@/lib/prisma';

export const USERS_PAGE_SIZE = 20;

export interface UserFilter {
  q: string;
  role?: Role;
  active?: boolean;
  page: number;
}

export async function listUsers(filter: UserFilter) {
  const page = Math.max(1, filter.page);

  const where: Prisma.UserWhereInput = {};
  if (filter.role) {
    where.role = filter.role;
  }
  if (filter.active !== undefined) {
    where.active = filter.active;
  }
  if (filter.q) {
    const q = filter.q;
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
      take: USERS_PAGE_SIZE,
      skip: (page - 1) * USERS_PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize: USERS_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / USERS_PAGE_SIZE)),
  };
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}