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
import { Input, inputBase } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

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
          <Label htmlFor="name">Equipment name</Label>
          <Input
            id="name"
            type="text"
            placeholder="e.g. CNC Milling Machine"
            className="mt-1"
            {...register('name')}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-destructive-foreground">
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="assetNumber">Asset number</Label>
          <Input
            id="assetNumber"
            type="text"
            placeholder="e.g. CNC-001"
            className="mt-1"
            {...register('assetNumber')}
          />
          {errors.assetNumber && (
            <p className="mt-1 text-sm text-destructive-foreground">
              {errors.assetNumber.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="factoryId">Factory</Label>
          <select
            id="factoryId"
            className={cn(inputBase, 'mt-1')}
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
            <p className="mt-1 text-sm text-destructive-foreground">
              {errors.factoryId.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            type="text"
            placeholder="e.g. Section A"
            className="mt-1"
            {...register('location')}
          />
          {errors.location && (
            <p className="mt-1 text-sm text-destructive-foreground">
              {errors.location.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className={cn(inputBase, 'mt-1')}
            {...register('status')}
          >
            {EQUIPMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          {errors.status && (
            <p className="mt-1 text-sm text-destructive-foreground">
              {errors.status.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="criticality">Criticality</Label>
          <select
            id="criticality"
            className={cn(inputBase, 'mt-1')}
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
            <p className="mt-1 text-sm text-destructive-foreground">
              {errors.criticality.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={3}
          placeholder="What the equipment is and what it is used for"
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
              : 'Create equipment'}
        </Button>
      </div>
    </form>
  );
}
