'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { EquipmentStatus } from '@prisma/client';
import {
  EQUIPMENT_STATUSES,
  equipmentFormSchema,
  type EquipmentFormValues,
} from '@/lib/validations';
import {
  createEquipment,
  updateEquipment,
  type EquipmentActionResult,
} from '@/server/actions/equipment';
import { Button } from '@/components/ui/button';

const STATUS_LABELS: Record<EquipmentStatus, string> = {
  OPERATIONAL: 'Operational',
  UNDER_MAINTENANCE: 'Under maintenance',
  OFFLINE: 'Offline',
};

const CRITICALITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'] as const;

export interface EquipmentFormFactory {
  id: string;
  name: string;
  location: string;
}

export interface EquipmentFormDefaults {
  id: string;
  name: string;
  assetNumber: string;
  description: string | null;
  location: string;
  status: EquipmentStatus;
  criticality: string | null;
  factoryId: string;
}

const inputClass =
  'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';
const labelClass = 'block text-sm font-medium text-gray-700';

export function EquipmentForm({
  factories,
  equipment,
}: {
  factories: EquipmentFormFactory[];
  equipment?: EquipmentFormDefaults;
}) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(equipment);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: equipment
      ? {
          name: equipment.name,
          assetNumber: equipment.assetNumber,
          description: equipment.description ?? '',
          location: equipment.location,
          status: equipment.status,
          criticality: equipment.criticality ?? '',
          factoryId: equipment.factoryId,
        }
      : {
          name: '',
          assetNumber: '',
          description: '',
          location: '',
          status: EQUIPMENT_STATUSES[0],
          criticality: '',
          factoryId: '',
        },
  });

  const submitting = isSubmitting || isPending;

  function onSubmit(values: EquipmentFormValues) {
    setActionError(null);
    startTransition(async () => {
      const result: EquipmentActionResult = isEdit
        ? await updateEquipment(equipment!.id, values)
        : await createEquipment(values);

      if (!result.ok) {
        setActionError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>
            Equipment name
          </label>
          <input
            id="name"
            type="text"
            placeholder="e.g. CNC Milling Machine"
            className={inputClass}
            {...register('name')}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="assetNumber" className={labelClass}>
            Asset number
          </label>
          <input
            id="assetNumber"
            type="text"
            placeholder="e.g. CNC-001"
            className={inputClass}
            {...register('assetNumber')}
          />
          {errors.assetNumber && (
            <p className="mt-1 text-sm text-red-600">
              {errors.assetNumber.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="factoryId" className={labelClass}>
            Factory
          </label>
          <select
            id="factoryId"
            className={inputClass}
            {...register('factoryId')}
          >
            <option value="">Select a factory</option>
            {factories.map((factory) => (
              <option key={factory.id} value={factory.id}>
                {factory.name} — {factory.location}
              </option>
            ))}
          </select>
          {errors.factoryId && (
            <p className="mt-1 text-sm text-red-600">
              {errors.factoryId.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="location" className={labelClass}>
            Location
          </label>
          <input
            id="location"
            type="text"
            placeholder="e.g. Section A"
            className={inputClass}
            {...register('location')}
          />
          {errors.location && (
            <p className="mt-1 text-sm text-red-600">
              {errors.location.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select id="status" className={inputClass} {...register('status')}>
            {EQUIPMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          {errors.status && (
            <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="criticality" className={labelClass}>
            Criticality
          </label>
          <select
            id="criticality"
            className={inputClass}
            {...register('criticality')}
          >
            <option value="">Not rated</option>
            {CRITICALITY_OPTIONS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          {errors.criticality && (
            <p className="mt-1 text-sm text-red-600">
              {errors.criticality.message}
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
          rows={3}
          placeholder="What the equipment is and what it is used for"
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
              : 'Create equipment'}
        </Button>
      </div>
    </form>
  );
}
