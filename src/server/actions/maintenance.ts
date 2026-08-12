'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { PERMISSIONS, requirePermission } from '@/server/rbac';
import {
  maintenanceTaskFormSchema,
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