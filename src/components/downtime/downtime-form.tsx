'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { DowntimeReason } from '@prisma/client';
import {
  DOWNTIME_REASONS,
  downtimeEventFormSchema,
  type DowntimeEventFormValues,
} from '@/lib/validations';
import {
  recordDowntimeEvent,
  type DowntimeActionResult,
} from '@/server/actions/downtime';
import { Button } from '@/components/ui/button';
import { Input, inputBase } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const REASON_LABELS: Record<DowntimeReason, string> = {
  MECHANICAL: 'Mechanical',
  ELECTRICAL: 'Electrical',
  HYDRAULIC: 'Hydraulic',
  PNEUMATIC: 'Pneumatic',
  MATERIAL: 'Material',
  OPERATOR_ERROR: 'Operator error',
  QUALITY: 'Quality',
  CHANGEOVER: 'Changeover',
};

export interface DowntimeFormEquipment {
  id: string;
  name: string;
  assetNumber: string;
}

export function DowntimeForm({
  equipments,
}: {
  equipments: DowntimeFormEquipment[];
}) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DowntimeEventFormValues>({
    resolver: zodResolver(downtimeEventFormSchema),
    defaultValues: {
      equipmentId: '',
      startedAt: '',
      endedAt: '',
      reason: DOWNTIME_REASONS[0],
      notes: '',
    },
  });

  const submitting = isSubmitting || isPending;

  function onSubmit(values: DowntimeEventFormValues) {
    setActionError(null);
    startTransition(async () => {
      const result: DowntimeActionResult = await recordDowntimeEvent(values);
      if (!result.ok) {
        setActionError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="equipmentId">Equipment</Label>
        <select
          id="equipmentId"
          className={cn(inputBase, 'mt-1')}
          {...register('equipmentId')}
        >
          <option value="">Select equipment</option>
          {equipments.map((equipment) => (
            <option key={equipment.id} value={equipment.id}>
              {equipment.name} — {equipment.assetNumber}
            </option>
          ))}
        </select>
        {errors.equipmentId && (
          <p className="mt-1 text-sm text-destructive-foreground">
            {errors.equipmentId.message}
          </p>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <Label htmlFor="startedAt">Start date/time</Label>
          <Input
            id="startedAt"
            type="datetime-local"
            className="mt-1"
            {...register('startedAt')}
          />
          {errors.startedAt && (
            <p className="mt-1 text-sm text-destructive-foreground">
              {errors.startedAt.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="endedAt">End date/time</Label>
          <Input
            id="endedAt"
            type="datetime-local"
            className="mt-1"
            {...register('endedAt')}
          />
          <p className="mt-1 text-xs text-gray-500">
            Leave empty to record ongoing downtime. You can resolve the event
            later with an end time.
          </p>
          {errors.endedAt && (
            <p className="mt-1 text-sm text-destructive-foreground">
              {errors.endedAt.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="reason">Reason</Label>
        <select
          id="reason"
          className={cn(inputBase, 'mt-1')}
          {...register('reason')}
        >
          {DOWNTIME_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {REASON_LABELS[reason]}
            </option>
          ))}
        </select>
        {errors.reason && (
          <p className="mt-1 text-sm text-destructive-foreground">
            {errors.reason.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="notes">Notes / details</Label>
        <Textarea
          id="notes"
          rows={4}
          placeholder="What happened? Any details worth recording?"
          className="mt-1"
          {...register('notes')}
        />
        {errors.notes && (
          <p className="mt-1 text-sm text-destructive-foreground">
            {errors.notes.message}
          </p>
        )}
      </div>

      {actionError && (
        <div className="rounded-lg border border-destructive-foreground/30 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
          {actionError}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Recording...' : 'Record downtime'}
        </Button>
      </div>
    </form>
  );
}
