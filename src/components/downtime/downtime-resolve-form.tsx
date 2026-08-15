'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  downtimeEventResolveSchema,
  type DowntimeEventResolveValues,
} from '@/lib/validations';
import {
  resolveDowntimeEvent,
  type DowntimeActionResult,
} from '@/server/actions/downtime';
import { Button } from '@/components/ui/button';

const inputClass =
  'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';
const labelClass = 'block text-sm font-medium text-gray-700';

export function DowntimeResolveForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DowntimeEventResolveValues>({
    resolver: zodResolver(downtimeEventResolveSchema),
    defaultValues: { endedAt: '' },
  });

  const submitting = isSubmitting || isPending;

  function onSubmit(values: DowntimeEventResolveValues) {
    setActionError(null);
    startTransition(async () => {
      const result: DowntimeActionResult = await resolveDowntimeEvent(
        eventId,
        values
      );
      if (!result.ok) {
        setActionError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
        {errors.endedAt && (
          <p className="mt-1 text-sm text-red-600">
            {errors.endedAt.message}
          </p>
        )}
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Resolving...' : 'Resolve event'}
      </Button>
    </form>
  );
}