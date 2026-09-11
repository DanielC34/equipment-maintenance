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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
        <Label htmlFor="endedAt">End date/time</Label>
        <Input
          id="endedAt"
          type="datetime-local"
          className="mt-1"
          {...register('endedAt')}
        />
        {errors.endedAt && (
          <p className="mt-1 text-sm text-destructive-foreground">
            {errors.endedAt.message}
          </p>
        )}
      </div>

      {actionError && (
        <div className="rounded-lg border border-destructive-foreground/30 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
          {actionError}
        </div>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Resolving...' : 'Resolve event'}
      </Button>
    </form>
  );
}
