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

const inputClass =
  'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';
const labelClass = 'block text-sm font-medium text-gray-700';

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
        <label htmlFor="equipmentId" className={labelClass}>
          Equipment
        </label>
        <select
          id="equipmentId"
          className={inputClass}
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
          <p className="mt-1 text-sm text-red-600">
            {errors.equipmentId.message}
          </p>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="startedAt" className={labelClass}>
            Start date/time
          </label>
          <input
            id="startedAt"
            type="datetime-local"
            className={inputClass}
            {...register('startedAt')}
          />
          {errors.startedAt && (
            <p className="mt-1 text-sm text-red-600">
              {errors.startedAt.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="endedAt" className={labelClass}>
            End date/time
          </label>
          <input
            id="endedAt"
            type="datetime-local"
            className={inputClass}
            {...register('endedAt')}
          />
          <p className="mt-1 text-xs text-gray-500">
            Leave empty to record ongoing downtime. You can resolve the event
            later with an end time.
          </p>
          {errors.endedAt && (
            <p className="mt-1 text-sm text-red-600">
              {errors.endedAt.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="reason" className={labelClass}>
          Reason
        </label>
        <select id="reason" className={inputClass} {...register('reason')}>
          {DOWNTIME_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {REASON_LABELS[reason]}
            </option>
          ))}
        </select>
        {errors.reason && (
          <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="notes" className={labelClass}>
          Notes / details
        </label>
        <textarea
          id="notes"
          rows={4}
          placeholder="What happened? Any details worth recording?"
          className={inputClass}
          {...register('notes')}
        />
        {errors.notes && (
          <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
        )}
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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