import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email({ error: 'Enter a valid email address.' }).trim(),
  password: z.string().min(1, { error: 'Password is required.' }),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const EQUIPMENT_STATUSES = [
  'OPERATIONAL',
  'UNDER_MAINTENANCE',
  'OFFLINE',
] as const;

export const equipmentFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: 'Equipment name is required.' })
    .max(120),
  assetNumber: z
    .string()
    .trim()
    .min(1, { error: 'Asset number is required.' })
    .max(60),
  description: z.string().trim().max(500).optional(),
  location: z
    .string()
    .trim()
    .min(1, { error: 'Location is required.' })
    .max(120),
  status: z.enum(EQUIPMENT_STATUSES, { error: 'Status is required.' }),
  criticality: z.string().trim().max(40).optional(),
  factoryId: z.string().min(1, { error: 'Select the factory.' }),
});

export type EquipmentFormValues = z.infer<typeof equipmentFormSchema>;

export const equipmentFilterSchema = z.object({
  q: z.string().trim().max(120).catch(''),
  status: z
    .enum(EQUIPMENT_STATUSES)
    .or(z.literal(''))
    .transform((value) => (value === '' ? undefined : value))
    .catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});

export type EquipmentFilterValues = z.infer<typeof equipmentFilterSchema>;

export const MAINTENANCE_STATUSES = [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export const maintenanceTaskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: 'Task title is required.' })
    .max(200),
  description: z.string().trim().max(2000).optional(),
  equipmentId: z.string().min(1, { error: 'Select the equipment.' }),
  assignedUserId: z.string().min(1, { error: 'Select an assigned user.' }),
  scheduledDate: z
    .string({ error: 'Select a scheduled date.' })
    .min(1, { error: 'Select a scheduled date.' })
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      error: 'Enter a valid date and time.',
    }),
  priority: z.enum(PRIORITIES, { error: 'Priority is required.' }),
});

export type MaintenanceTaskFormValues = z.infer<
  typeof maintenanceTaskFormSchema
>;

export const maintenanceFilterSchema = z.object({
  q: z.string().trim().max(200).catch(''),
  status: z
    .enum(MAINTENANCE_STATUSES)
    .or(z.literal(''))
    .transform((value) => (value === '' ? undefined : value))
    .catch(undefined),
  priority: z
    .enum(PRIORITIES)
    .or(z.literal(''))
    .transform((value) => (value === '' ? undefined : value))
    .catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});

export type MaintenanceFilterValues = z.infer<typeof maintenanceFilterSchema>;
