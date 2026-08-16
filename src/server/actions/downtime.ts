'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { PERMISSIONS, requirePermission } from '@/server/rbac';
import {
  downtimeEventFormSchema,
  downtimeEventResolveSchema,
  type DowntimeEventFormValues,
  type DowntimeEventResolveValues,
} from '@/lib/validations';
import { getDowntimeEventById } from '@/server/downtime';

export type DowntimeActionResult =
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

function crossedTimesError(fieldErrors?: Record<string, string>) {
  return {
    ok: false as const,
    error: 'End date/time must be after the start date/time.',
    fieldErrors,
  };
}

export async function recordDowntimeEvent(
  values: DowntimeEventFormValues
): Promise<DowntimeActionResult> {
  const session = await requirePermission(PERMISSIONS.downtimeRecord);

  const parsed = downtimeEventFormSchema.safeParse(values);
  if (!parsed.success) {
    const crossedTimes = parsed.error.issues.some(
      (issue) =>
        issue.path.length === 1 &&
        issue.path[0] === 'endedAt' &&
        issue.message === 'Must be after the start time.'
    );
    if (crossedTimes) {
      return crossedTimesError({ endedAt: 'Must be after the start time.' });
    }
    return {
      ok: false,
      error: 'Check the highlighted fields and try again.',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;
  const startedAt = new Date(data.startedAt);
  const endedAt = data.endedAt ? new Date(data.endedAt) : null;

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

  const event = await prisma.downtimeEvent.create({
    data: {
      equipmentId: data.equipmentId,
      reportedById: session.user.id,
      startedAt,
      endedAt,
      status: endedAt ? 'RESOLVED' : 'OPEN',
      reason: data.reason,
      notes: data.notes?.trim() ? data.notes : null,
    },
  });

  revalidatePath('/downtime');
  revalidatePath('/equipment');
  redirect(`/downtime/${event.id}`);
}

export async function resolveDowntimeEvent(
  id: string,
  values: DowntimeEventResolveValues
): Promise<DowntimeActionResult> {
  await requirePermission(PERMISSIONS.downtimeResolve);

  const parsed = downtimeEventResolveSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Check the highlighted fields and try again.',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const event = await getDowntimeEventById(id);
  if (!event) {
    return { ok: false, error: 'This downtime event no longer exists.' };
  }

  if (event.status === 'RESOLVED') {
    return {
      ok: false,
      error: 'This downtime event has already been resolved.',
    };
  }

  const endedAt = new Date(parsed.data.endedAt);
  if (endedAt.getTime() <= event.startedAt.getTime()) {
    return crossedTimesError({ endedAt: 'Must be after the start time.' });
  }

  await prisma.downtimeEvent.update({
    where: { id },
    data: { endedAt, status: 'RESOLVED' },
  });

  revalidatePath('/downtime');
  revalidatePath('/equipment');
  revalidatePath(`/downtime/${id}`);
  return { ok: true };
}