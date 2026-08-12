'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Priority } from '@prisma/client';
import {
  PRIORITIES,
  maintenanceTaskFormSchema,
  type MaintenanceTaskFormValues,
} from '@/lib/validations';
import {
  createMaintenanceTask,
  updateMaintenanceTask,
  type MaintenanceActionResult,
} from '@/server/actions/maintenance';
import { Button } from '@/components/ui/button';

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export interface MaintenanceFormEquipment {
  id: string;
  name: string;
  assetNumber: string;
}

export interface MaintenanceFormUser {
  id: string;
  name: string;
  role: string;
}

export interface MaintenanceFormDefaults {
  id: string;
  title: string;
  description: string | null;
  equipmentId: string;
  assignedUserId: string | null;
  scheduledDate: Date;
  priority: Priority;
}

const inputClass =
  'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';
const labelClass = 'block text-sm font-medium text-gray-700';

function toDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function MaintenanceForm({
  equipments,
  assignableUsers,
  task,
}: {
  equipments: MaintenanceFormEquipment[];
  assignableUsers: MaintenanceFormUser[];
  task?: MaintenanceFormDefaults;
}) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(task);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MaintenanceTaskFormValues>({
    resolver: zodResolver(maintenanceTaskFormSchema),
    defaultValues: task
      ? {
          title: task.title,
          description: task.description ?? '',
          equipmentId: task.equipmentId,
          assignedUserId: task.assignedUserId ?? '',
          scheduledDate: toDateTimeLocal(task.scheduledDate),
          priority: task.priority,
        }
      : {
          title: '',
          description: '',
          equipmentId: '',
          assignedUserId: '',
          scheduledDate: '',
          priority: PRIORITIES[1],
        },
  });

  const submitting = isSubmitting || isPending;

  function onSubmit(values: MaintenanceTaskFormValues) {
    setActionError(null);
    startTransition(async () => {
      const result: MaintenanceActionResult = isEdit
        ? await updateMaintenanceTask(task!.id, values)
        : await createMaintenanceTask(values);

      if (!result.ok) {
        setActionError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <label htmlFor="title" className={labelClass}>
          Task title
        </label>
        <input
          id="title"
          type="text"
          placeholder="e.g. Monthly Calibration"
          className={inputClass}
          {...register('title')}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
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

        <div>
          <label htmlFor="assignedUserId" className={labelClass}>
            Assigned to
          </label>
          <select
            id="assignedUserId"
            className={inputClass}
            {...register('assignedUserId')}
          >
            <option value="">Select a user</option>
            {assignableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role})
              </option>
            ))}
          </select>
          {errors.assignedUserId && (
            <p className="mt-1 text-sm text-red-600">
              {errors.assignedUserId.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="scheduledDate" className={labelClass}>
            Scheduled date
          </label>
          <input
            id="scheduledDate"
            type="datetime-local"
            className={inputClass}
            {...register('scheduledDate')}
          />
          {errors.scheduledDate && (
            <p className="mt-1 text-sm text-red-600">
              {errors.scheduledDate.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="priority" className={labelClass}>
            Priority
          </label>
          <select id="priority" className={inputClass} {...register('priority')}>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
          {errors.priority && (
            <p className="mt-1 text-sm text-red-600">
              {errors.priority.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          placeholder="What work needs to be done and any relevant details"
          className={inputClass}
          {...register('description')}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">
            {errors.description.message}
          </p>
        )}
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting
            ? isEdit
              ? 'Saving...'
              : 'Creating...'
            : isEdit
              ? 'Save changes'
              : 'Schedule maintenance'}
        </Button>
      </div>
    </form>
  );
}