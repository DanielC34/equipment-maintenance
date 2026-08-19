'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { PERMISSIONS, requirePermission } from '@/server/rbac';
import {
  equipmentFormSchema,
  type EquipmentFormValues,
} from '@/lib/validations';
import { writeAuditLog } from '@/server/audit';
import { invalidateAggregateCaches } from '@/lib/cache';

export type EquipmentActionResult =
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

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

export async function createEquipment(
  values: EquipmentFormValues
): Promise<EquipmentActionResult> {
  const session = await requirePermission(PERMISSIONS.equipmentCreate);

  const parsed = equipmentFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Check the highlighted fields and try again.',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const factory = await prisma.factory.findUnique({
    where: { id: data.factoryId },
  });
  if (!factory) {
    return {
      ok: false,
      error:
        'The selected factory no longer exists. Reload the page and try again.',
    };
  }

  try {
    const equipment = await prisma.$transaction(async (tx) => {
      const created = await tx.equipment.create({
        data: {
          name: data.name,
          assetNumber: data.assetNumber,
          description: data.description?.trim() ? data.description : null,
          location: data.location,
          status: data.status,
          criticality: data.criticality?.trim() ? data.criticality : null,
          factoryId: data.factoryId,
        },
      });

      await writeAuditLog(tx, {
        actorId: session.user.id,
        action: 'CREATE',
        entityType: 'EQUIPMENT',
        entityId: created.id,
        entityLabel: created.name,
      });

      return created;
    });

    revalidatePath('/equipment');
    await invalidateAggregateCaches();
    redirect(`/equipment/${equipment.id}`);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        error:
          'An asset with this number already exists. Choose a different asset number.',
      };
    }
    throw error;
  }
}

export async function updateEquipment(
  id: string,
  values: EquipmentFormValues
): Promise<EquipmentActionResult> {
  const session = await requirePermission(PERMISSIONS.equipmentEdit);

  const parsed = equipmentFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Check the highlighted fields and try again.',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const existing = await prisma.equipment.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: 'This equipment no longer exists.' };
  }
  if (existing.deletedAt) {
    return {
      ok: false,
      error:
        'This equipment has been archived and can no longer be edited.',
    };
  }

  const factory = await prisma.factory.findUnique({
    where: { id: data.factoryId },
  });
  if (!factory) {
    return {
      ok: false,
      error:
        'The selected factory no longer exists. Reload the page and try again.',
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.equipment.update({
        where: { id },
        data: {
          name: data.name,
          assetNumber: data.assetNumber,
          description: data.description?.trim() ? data.description : null,
          location: data.location,
          status: data.status,
          criticality: data.criticality?.trim() ? data.criticality : null,
          factoryId: data.factoryId,
        },
      });

      await writeAuditLog(tx, {
        actorId: session.user.id,
        action: 'UPDATE',
        entityType: 'EQUIPMENT',
        entityId: id,
        entityLabel: data.name,
      });
    });

    revalidatePath('/equipment');
    revalidatePath(`/equipment/${id}`);
    await invalidateAggregateCaches();
    redirect(`/equipment/${id}`);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        error:
          'An asset with this number already exists. Choose a different asset number.',
      };
    }
    throw error;
  }
}

export async function deleteEquipment(
  id: string
): Promise<EquipmentActionResult> {
  const session = await requirePermission(PERMISSIONS.equipmentDelete);

  const existing = await prisma.equipment.findUnique({
    where: { id },
    select: { id: true, name: true, deletedAt: true },
  });
  if (!existing) {
    return { ok: false, error: 'This equipment no longer exists.' };
  }
  if (existing.deletedAt) {
    return {
      ok: false,
      error: 'This equipment has already been archived.',
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.equipment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await writeAuditLog(tx, {
      actorId: session.user.id,
      action: 'DELETE',
      entityType: 'EQUIPMENT',
      entityId: id,
      entityLabel: existing.name,
    });
  });

  revalidatePath('/equipment');
  revalidatePath('/dashboard');
  revalidatePath('/maintenance');
  revalidatePath('/downtime');
  revalidatePath('/reports');
  revalidatePath(`/equipment/${id}`);
  await invalidateAggregateCaches();
  return { ok: true };
}
