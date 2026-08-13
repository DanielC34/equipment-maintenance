'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { PERMISSIONS, requirePermission } from '@/server/rbac';
import {
  maintenanceCompletionSchema,
  maintenanceTaskFormSchema,
  type MaintenanceCompletionValues,
  type MaintenanceTaskFormValues,
} from '@/lib/validations';
import {
  getMaintenanceTaskById,
  userCanBeAssigned,
} from '@/server/maintenance';

export type MaintenanceActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export async function createMaintenanceTask(
  values: MaintenanceTaskFormValues
): Promise<MaintenanceActionResult> {
  await requirePermission(PERMISSIONS.maintenanceSchedule);

  const parsed = maintenanceTaskFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Check the highlighted fields and try again.',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const equipment = await prisma.equipment.findUnique({
    where: { id: data.equipmentId },
    select: { id: true },
  });
  if (!equipment) {
    return {
      ok: false,
      error:
        'The selected equipment no longer exists. Reload the page and try again.',
    };
  }

  if (!(await userCanBeAssigned(data.assignedUserId))) {
    return {
      ok: false,
      error:
        'The selected user cannot be assigned maintenance work. Choose a technician (or another maintenance-capable user).',
    };
  }

  const task = await prisma.maintenanceTask.create({
    data: {
      title: data.title,
      description: data.description?.trim() ? data.description : null,
      equipmentId: data.equipmentId,
      assignedUserId: data.assignedUserId,
      scheduledDate: new Date(data.scheduledDate),
      priority: data.priority,
    },
  });

  revalidatePath('/maintenance');
  revalidatePath('/equipment');
  redirect(`/maintenance/${task.id}`);
}

export async function updateMaintenanceTask(
  id: string,
  values: MaintenanceTaskFormValues
): Promise<MaintenanceActionResult> {
  await requirePermission(PERMISSIONS.maintenanceSchedule);

  const parsed = maintenanceTaskFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Check the highlighted fields and try again.',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const existing = await getMaintenanceTaskById(id);
  if (!existing) {
    return { ok: false, error: 'This maintenance task no longer exists.' };
  }

  if (
    existing.status === 'COMPLETED' ||
    existing.status === 'CANCELLED'
  ) {
    return {
      ok: false,
      error:
        'This task is no longer schedulable and cannot be edited. Only scheduled and in-progress tasks can be updated.',
    };
  }

  const equipment = await prisma.equipment.findUnique({
    where: { id: data.equipmentId },
    select: { id: true },
  });
  if (!equipment) {
    return {
      ok: false,
      error:
        'The selected equipment no longer exists. Reload the page and try again.',
    };
  }

  if (!(await userCanBeAssigned(data.assignedUserId))) {
    return {
      ok: false,
      error:
        'The selected user cannot be assigned maintenance work. Choose a technician (or another maintenance-capable user).',
    };
  }

  await prisma.maintenanceTask.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description?.trim() ? data.description : null,
      equipmentId: data.equipmentId,
      assignedUserId: data.assignedUserId,
      scheduledDate: new Date(data.scheduledDate),
      priority: data.priority,
      status: existing.status,
    },
  });

  revalidatePath('/maintenance');
  revalidatePath('/equipment');
  revalidatePath(`/maintenance/${id}`);
  redirect(`/maintenance/${id}`);
}

export async function startMaintenanceTask(
  id: string
): Promise<MaintenanceActionResult> {
  const session = await requirePermission(PERMISSIONS.maintenanceComplete);

  const task = await getMaintenanceTaskById(id);
  if (!task) {
    return { ok: false, error: 'This maintenance task no longer exists.' };
  }

  if (task.status === 'COMPLETED') {
    return {
      ok: false,
      error: 'This task has already been completed and cannot be restarted.',
    };
  }

  if (task.status === 'IN_PROGRESS') {
    return { ok: false, error: 'This task is already in progress.' };
  }

  if (task.status === 'CANCELLED') {
    return {
      ok: false,
      error: 'This task was cancelled and cannot be started.',
    };
  }

  if (task.assignedUserId !== session.user.id) {
    return {
      ok: false,
      error:
        'Only the technician assigned to this task can start the work.',
    };
  }

  await prisma.maintenanceTask.update({
    where: { id },
    data: { status: 'IN_PROGRESS' },
  });

  revalidatePath('/maintenance');
  revalidatePath(`/maintenance/${id}`);
  return { ok: true };
}

export async function completeMaintenanceTask(
  id: string,
  values: MaintenanceCompletionValues
): Promise<MaintenanceActionResult> {
  const session = await requirePermission(PERMISSIONS.maintenanceComplete);

  const parsed = maintenanceCompletionSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Check the highlighted fields and try again.',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const task = await getMaintenanceTaskById(id);
  if (!task) {
    return { ok: false, error: 'This maintenance task no longer exists.' };
  }

  if (task.status === 'COMPLETED') {
    return {
      ok: false,
      error: 'This task has already been completed.',
    };
  }

  if (task.status === 'CANCELLED') {
    return {
      ok: false,
      error: 'This task was cancelled and cannot be completed.',
    };
  }

  if (task.status === 'SCHEDULED') {
    return {
      ok: false,
      error:
        'Start the task before recording its completion. Tasks move from scheduled to in progress to completed.',
    };
  }

  if (task.assignedUserId !== session.user.id) {
    return {
      ok: false,
      error:
        'Only the technician assigned to this task can record its completion.',
    };
  }

  const parts = data.parts
    .filter((part) => part.name.trim() && part.quantity > 0)
    .map((part) => ({ name: part.name.trim(), quantity: part.quantity }));

  await prisma.$transaction(async (tx) => {
    await tx.maintenanceRecord.create({
      data: {
        taskId: id,
        equipmentId: task.equipmentId,
        technicianId: session.user.id,
        description: data.description,
        notes: data.notes.trim() ? data.notes : null,
        completedDate: new Date(),
        partsUsed: {
          create: parts,
        },
      },
    });

    await tx.maintenanceTask.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
  });

  revalidatePath('/maintenance');
  revalidatePath('/equipment');
  revalidatePath(`/maintenance/${id}`);
  return { ok: true };
}