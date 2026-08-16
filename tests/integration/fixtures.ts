import prisma from '@/lib/prisma';
import type {
  Role,
  EquipmentStatus,
  MaintenanceStatus,
  Priority,
  DowntimeStatus,
  DowntimeReason,
} from '@prisma/client';

const runId = `${Date.now().toString(36)}${Math.random()
  .toString(36)
  .slice(2, 6)}`;

export function unique(prefix: string): string {
  return `${prefix}_${runId}`;
}

export interface CleanupSet {
  factoryIds?: string[];
  userIds?: string[];
  equipmentIds?: string[];
  taskIds?: string[];
  recordIds?: string[];
  downtimeIds?: string[];
}

export async function cleanup(set: CleanupSet): Promise<void> {
  const factoryIds = set.factoryIds ?? [];
  const userIds = set.userIds ?? [];
  const equipmentIds = set.equipmentIds ?? [];
  const taskIds = set.taskIds ?? [];
  const recordIds = set.recordIds ?? [];
  const downtimeIds = set.downtimeIds ?? [];

  const recordOr = [
    { id: { in: recordIds } },
    { equipmentId: { in: equipmentIds } },
    { technicianId: { in: userIds } },
  ];

  await prisma.downtimeEvent.deleteMany({
    where: {
      OR: [
        { id: { in: downtimeIds } },
        { equipmentId: { in: equipmentIds } },
        { reportedById: { in: userIds } },
      ],
    },
  });
  await prisma.partUsed.deleteMany({
    where: { maintenanceRecord: { OR: recordOr } },
  });
  await prisma.maintenanceRecord.deleteMany({ where: { OR: recordOr } });
  await prisma.maintenanceTask.deleteMany({
    where: {
      OR: [
        { id: { in: taskIds } },
        { equipmentId: { in: equipmentIds } },
        { assignedUserId: { in: userIds } },
      ],
    },
  });
  await prisma.equipment.deleteMany({
    where: {
      OR: [
        { id: { in: equipmentIds } },
        { factoryId: { in: factoryIds } },
      ],
    },
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.factory.deleteMany({ where: { id: { in: factoryIds } } });
}

export async function wipeTables(): Promise<void> {
  await prisma.downtimeEvent.deleteMany();
  await prisma.partUsed.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.maintenanceTask.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.user.deleteMany();
  await prisma.factory.deleteMany();
}

export async function createFactory(name = unique('factory')): Promise<string> {
  const factory = await prisma.factory.create({
    data: { name, location: unique('loc') },
  });
  return factory.id;
}

export async function createUser(
  role: Role,
  name = unique('user')
): Promise<string> {
  const user = await prisma.user.create({
    data: {
      name,
      email: `${unique('u')}@${role.toLowerCase()}.test`,
      password: 'not-used',
      role,
    },
  });
  return user.id;
}

export async function createEquipment(
  factoryId: string,
  overrides: Partial<{
    name: string;
    assetNumber: string;
    description: string | null;
    location: string;
    status: EquipmentStatus;
    criticality: string | null;
  }> = {}
): Promise<string> {
  const equipment = await prisma.equipment.create({
    data: {
      name: overrides.name ?? unique('eq'),
      assetNumber: overrides.assetNumber ?? unique('asset'),
      description: overrides.description ?? null,
      location: overrides.location ?? unique('loc'),
      status: overrides.status ?? 'OPERATIONAL',
      criticality: overrides.criticality ?? null,
      factoryId,
    },
  });
  return equipment.id;
}

export async function createTask(
  equipmentId: string,
  assignedUserId: string | null,
  overrides: Partial<{
    title: string;
    description: string | null;
    status: MaintenanceStatus;
    priority: Priority;
    scheduledDate: Date;
  }> = {}
): Promise<string> {
  const task = await prisma.maintenanceTask.create({
    data: {
      title: overrides.title ?? unique('task'),
      description: overrides.description ?? null,
      equipmentId,
      assignedUserId,
      scheduledDate:
        overrides.scheduledDate ?? new Date(Date.now() + 86400000 * 7),
      priority: overrides.priority ?? 'MEDIUM',
      status: overrides.status ?? 'SCHEDULED',
    },
  });
  return task.id;
}

export async function createRecord(
  equipmentId: string,
  technicianId: string,
  overrides: Partial<{
    taskId: string | null;
    description: string;
    notes: string | null;
    completedDate: Date;
  }> = {},
  parts: { name: string; quantity: number }[] = []
): Promise<string> {
  const record = await prisma.maintenanceRecord.create({
    data: {
      equipmentId,
      technicianId,
      taskId: overrides.taskId ?? null,
      description: overrides.description ?? unique('rec'),
      notes: overrides.notes ?? null,
      completedDate: overrides.completedDate ?? new Date(),
      partsUsed: parts.length ? { create: parts } : undefined,
    },
  });
  return record.id;
}

export async function createDowntime(
  equipmentId: string,
  reportedById: string,
  overrides: Partial<{
    startedAt: Date;
    endedAt: Date | null;
    status: DowntimeStatus;
    reason: DowntimeReason;
    notes: string | null;
  }> = {}
): Promise<string> {
  const startedAt = overrides.startedAt ?? new Date(Date.now() - 3600000);
  const endedAt =
    overrides.endedAt === undefined
      ? new Date(startedAt.getTime() + 3600000)
      : overrides.endedAt;
  const event = await prisma.downtimeEvent.create({
    data: {
      equipmentId,
      reportedById,
      startedAt,
      endedAt,
      status: overrides.status ?? (endedAt ? 'RESOLVED' : 'OPEN'),
      reason: overrides.reason ?? 'MECHANICAL',
      notes: overrides.notes ?? null,
    },
  });
  return event.id;
}

export function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

export function dateAtDaysFromNow(days: number): Date {
  return new Date(Date.now() + days * 86400000);
}