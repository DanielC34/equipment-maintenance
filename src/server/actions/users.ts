'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { PERMISSIONS, requirePermission } from '@/server/rbac';
import {
  userCreateSchema,
  userUpdateSchema,
  type UserCreateValues,
  type UserUpdateValues,
} from '@/lib/validations';
import { writeAuditLog } from '@/server/audit';
import { invalidateAggregateCaches } from '@/lib/cache';
import { userUpdateConflict } from '@/server/user-safety';

export type UserActionResult =
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

export async function createUser(
  values: UserCreateValues
): Promise<UserActionResult> {
  const session = await requirePermission(PERMISSIONS.usersManage);

  const parsed = userCreateSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Check the highlighted fields and try again.',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: await bcrypt.hash(data.password, 10),
          role: data.role,
          active: true,
        },
      });

      await writeAuditLog(tx, {
        actorId: session.user.id,
        action: 'CREATE',
        entityType: 'USER',
        entityId: created.id,
        entityLabel: created.name,
      });

      return created;
    });

    revalidatePath('/admin/users');
    await invalidateAggregateCaches();
    redirect(`/admin/users/${user.id}`);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        error: 'A user with this email already exists.',
      };
    }
    throw error;
  }
}

export async function updateUser(
  id: string,
  values: UserUpdateValues
): Promise<UserActionResult> {
  const session = await requirePermission(PERMISSIONS.usersManage);

  const parsed = userUpdateSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Check the highlighted fields and try again.',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const next = parsed.data;

  const outcome = await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true, active: true },
    });
    if (!target) {
      return { ok: false as const, error: 'This user no longer exists.' };
    }

    const otherActiveAdmins = await tx.user.count({
      where: { role: 'ADMINISTRATOR', active: true, id: { not: id } },
    });

    const conflict = userUpdateConflict(
      session.user.id,
      target,
      { id: target.id, role: next.role, active: next.active },
      otherActiveAdmins
    );
    if (conflict) {
      return { ok: false as const, error: conflict };
    }

    await tx.user.update({
      where: { id },
      data: { role: next.role, active: next.active },
    });

    await writeAuditLog(tx, {
      actorId: session.user.id,
      action: 'UPDATE',
      entityType: 'USER',
      entityId: id,
      entityLabel: target.name,
    });

    return { ok: true as const };
  });

  if (outcome.ok) {
    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${id}`);
    await invalidateAggregateCaches();
  }

  return outcome;
}