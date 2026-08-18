import type {
  AuditAction,
  AuditEntityType,
  Prisma,
  PrismaClient,
} from '@prisma/client'
import prisma from '@/lib/prisma'

export const AUDIT_PAGE_SIZE = 20

export interface AuditFilter {
  q: string
  actorId?: string
  action?: AuditAction
  entityType?: AuditEntityType
  from?: string
  to?: string
  page: number
}

export async function listAuditLog(filter: AuditFilter) {
  const page = Math.max(1, filter.page)

  const where: Prisma.AuditLogWhereInput = {}
  if (filter.actorId) {
    where.actorId = filter.actorId
  }
  if (filter.action) {
    where.action = filter.action
  }
  if (filter.entityType) {
    where.entityType = filter.entityType
  }

  const createdAt: Prisma.DateTimeFilter = {}
  if (filter.from) {
    const from = new Date(filter.from)
    if (!Number.isNaN(from.getTime())) {
      createdAt.gte = from
    }
  }
  if (filter.to) {
    const to = new Date(filter.to)
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999)
      createdAt.lte = to
    }
  }
  if (filter.from || filter.to) {
    where.createdAt = createdAt
  }

  if (filter.q) {
    const q = filter.q
    where.OR = [
      { actor: { name: { contains: q, mode: 'insensitive' } } },
      { actor: { email: { contains: q, mode: 'insensitive' } } },
      { entityLabel: { contains: q, mode: 'insensitive' } },
      { entityId: { contains: q, mode: 'insensitive' } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: AUDIT_PAGE_SIZE,
      skip: (page - 1) * AUDIT_PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ])

  return {
    items,
    total,
    page,
    pageSize: AUDIT_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
  }
}

export async function listAuditActors() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  })
}

export const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'created',
  UPDATE: 'updated',
  START: 'started',
  COMPLETE: 'completed',
  RESOLVE: 'resolved',
}

export const ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  EQUIPMENT: 'equipment',
  MAINTENANCE_TASK: 'maintenance task',
  MAINTENANCE_RECORD: 'maintenance record',
  DOWNTIME_EVENT: 'downtime event',
  USER: 'user',
}

export function describeAudit(entry: {
  action: AuditAction
  entityType: AuditEntityType
  entityLabel: string | null
}): string {
  const label =
    entry.entityLabel ?? ENTITY_TYPE_LABELS[entry.entityType]
  return `${ACTION_LABELS[entry.action]} ${ENTITY_TYPE_LABELS[entry.entityType]} "${label}"`
}

export type AuditWriteClient = Pick<PrismaClient, 'auditLog'>

export async function writeAuditLog(
  tx: AuditWriteClient,
  entry: {
    actorId: string
    action: AuditAction
    entityType: AuditEntityType
    entityId: string
    entityLabel?: string | null
  },
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      entityLabel: entry.entityLabel ?? null,
    },
  })
}