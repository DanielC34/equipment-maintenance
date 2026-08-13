'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import {
  maintenanceCompletionSchema,
  type MaintenanceCompletionValues,
} from '@/lib/validations';
import {
  completeMaintenanceTask,
  type MaintenanceActionResult,
} from '@/server/actions/maintenance';
import { Button } from '@/components/ui/button';

const inputClass =
  'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';
const labelClass = 'block text-sm font-medium text-gray-700';

export function MaintenanceCompleteForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MaintenanceCompletionValues>({
    resolver: zodResolver(maintenanceCompletionSchema),
    defaultValues: {
      description: '',
      notes: '',
      parts: [{ name: '', quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'parts',
  });

  const submitting = isSubmitting || isPending;

  function onSubmit(values: MaintenanceCompletionValues) {
    setActionError(null);
    startTransition(async () => {
      const result: MaintenanceActionResult = await completeMaintenanceTask(
        taskId,
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <label htmlFor="description" className={labelClass}>
          Work performed
        </label>
        <textarea
          id="description"
          rows={4}
          placeholder="Describe the maintenance work that was performed"
          className={inputClass}
          {...register('description')}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">
            {errors.description.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="notes" className={labelClass}>
          Findings / notes
        </label>
        <textarea
          id="notes"
          rows={3}
          placeholder="Anything observed during the work, findings, or follow-ups"
          className={inputClass}
          {...register('notes')}
        />
        {errors.notes && (
          <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className={labelClass}>Parts used</label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ name: '', quantity: 1 })}
            disabled={submitting}
          >
            <Plus aria-hidden />
            Add part
          </Button>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          List any parts consumed during this work. None required if no parts
          were used.
        </p>
        {fields.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No parts recorded.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-[1fr_auto_auto] items-start gap-3"
              >
                <div>
                  <input
                    aria-label={`Part name ${index + 1}`}
                    type="text"
                    placeholder="Part name"
                    className={inputClass}
                    {...register(`parts.${index}.name`)}
                  />
                  {errors.parts?.[index]?.name && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.parts[index].name.message}
                    </p>
                  )}
                </div>
                <div className="w-24">
                  <input
                    aria-label={`Part quantity ${index + 1}`}
                    type="number"
                    min={1}
                    placeholder="Qty"
                    className={inputClass}
                    {...register(`parts.${index}.quantity`, {
                      setValueAs: (value) => (value === '' ? NaN : Number(value)),
                    })}
                  />
                  {errors.parts?.[index]?.quantity && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.parts[index].quantity.message}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove part"
                  onClick={() => remove(index)}
                  disabled={submitting}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Recording...' : 'Complete maintenance'}
        </Button>
      </div>
    </form>
  );
}