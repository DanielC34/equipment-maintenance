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
import { Input, inputBase } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

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
        <Label htmlFor="title">Task title</Label>
        <Input
          id="title"
          type="text"
          placeholder="e.g. Monthly Calibration"
          className="mt-1"
          {...register('title')}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-destructive-foreground">
            {errors.title.message}
          </p>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
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

        <div>
          <Label htmlFor="assignedUserId">Assigned to</Label>
          <select
            id="assignedUserId"
            className={cn(inputBase, 'mt-1')}
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
            <p className="mt-1 text-sm text-destructive-foreground">
              {errors.assignedUserId.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="scheduledDate">Scheduled date</Label>
          <Input
            id="scheduledDate"
            type="datetime-local"
            className="mt-1"
            {...register('scheduledDate')}
          />
          {errors.scheduledDate && (
            <p className="mt-1 text-sm text-destructive-foreground">
              {errors.scheduledDate.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            className={cn(inputBase, 'mt-1')}
            {...register('priority')}
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
          {errors.priority && (
            <p className="mt-1 text-sm text-destructive-foreground">
              {errors.priority.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={4}
          placeholder="What work needs to be done and any relevant details"
          className="mt-1"
          {...register('description')}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-destructive-foreground">
            {errors.description.message}
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
