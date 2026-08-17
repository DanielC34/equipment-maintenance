import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .pipe(z.email({ error: 'Enter a valid email address.' })),
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
    })
    .refine((value) => {
      const time = new Date(value).getTime();
      return Number.isNaN(time) || time >= Date.now();
    }, { error: 'Scheduled date cannot be in the past.' }),
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

export const maintenancePartSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: 'Part name is required.' })
    .max(120),
  quantity: z
    .number({ error: 'Quantity must be a number.' })
    .int({ error: 'Quantity must be a whole number.' })
    .min(1, { error: 'Quantity must be at least 1.' })
    .max(100000, { error: 'Quantity is too large.' }),
});

export const maintenanceCompletionSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, { error: 'Describe the work performed.' })
    .max(2000),
  notes: z.string().trim().max(2000),
  parts: z.array(maintenancePartSchema).max(50),
});

export type MaintenanceCompletionValues = z.infer<
  typeof maintenanceCompletionSchema
>;

export const maintenanceHistoryFilterSchema = z.object({
  q: z.string().trim().max(200).catch(''),
  equipmentId: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : undefined))
    .catch(undefined),
  technicianId: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : undefined))
    .catch(undefined),
  from: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((value) => (value ? value : undefined))
    .catch(undefined),
  to: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((value) => (value ? value : undefined))
    .catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});

export type MaintenanceHistoryFilterValues = z.infer<
  typeof maintenanceHistoryFilterSchema
>;

export const DOWNTIME_STATUSES = ['OPEN', 'RESOLVED'] as const;

export const DOWNTIME_REASONS = [
  'MECHANICAL',
  'ELECTRICAL',
  'HYDRAULIC',
  'PNEUMATIC',
  'MATERIAL',
  'OPERATOR_ERROR',
  'QUALITY',
  'CHANGEOVER',
] as const;

export const downtimeEventFormSchema = z
  .object({
    equipmentId: z.string().min(1, { error: 'Select the equipment.' }),
    startedAt: z
      .string({ error: 'Select a start date and time.' })
      .min(1, { error: 'Select a start date and time.' })
      .refine((value) => !Number.isNaN(new Date(value).getTime()), {
        error: 'Enter a valid start date and time.',
      }),
    endedAt: z.string().refine(
      (value) => value === '' || !Number.isNaN(new Date(value).getTime()),
      { error: 'Enter a valid end date and time.' }
    ),
    reason: z.enum(DOWNTIME_REASONS, { error: 'Select a reason.' }),
    notes: z.string().trim().max(2000).optional(),
  })
  .superRefine((values, ctx) => {
    const started = new Date(values.startedAt).getTime();
    const ended = values.endedAt ? new Date(values.endedAt).getTime() : NaN;
    if (!Number.isNaN(started) && !Number.isNaN(ended) && ended <= started) {
      ctx.addIssue({
        code: 'custom',
        path: ['endedAt'],
        message: 'Must be after the start time.',
      });
    }
  });

export type DowntimeEventFormValues = z.infer<typeof downtimeEventFormSchema>;

export const downtimeEventResolveSchema = z.object({
  endedAt: z
    .string({ error: 'Select an end date and time.' })
    .min(1, { error: 'Select an end date and time.' })
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      error: 'Enter a valid end date and time.',
    }),
});

export type DowntimeEventResolveValues = z.infer<
  typeof downtimeEventResolveSchema
>;

export const downtimeFilterSchema = z.object({
  q: z.string().trim().max(200).catch(''),
  equipmentId: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : undefined))
    .catch(undefined),
  status: z
    .enum(DOWNTIME_STATUSES)
    .or(z.literal(''))
    .transform((value) => (value === '' ? undefined : value))
    .catch(undefined),
  from: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((value) => (value ? value : undefined))
    .catch(undefined),
  to: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((value) => (value ? value : undefined))
    .catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});

export type DowntimeFilterValues = z.infer<typeof downtimeFilterSchema>;

export const reportFilterSchema = z.object({
  from: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((value) => (value ? value : undefined))
    .catch(undefined),
  to: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((value) => (value ? value : undefined))
    .catch(undefined),
});

export type ReportFilterValues = z.infer<typeof reportFilterSchema>;

export const AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'START',
  'COMPLETE',
  'RESOLVE',
] as const;

export const AUDIT_ENTITY_TYPES = [
  'EQUIPMENT',
  'MAINTENANCE_TASK',
  'MAINTENANCE_RECORD',
  'DOWNTIME_EVENT',
] as const;

export const auditFilterSchema = z.object({
  q: z.string().trim().max(200).catch(''),
  actorId: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : undefined))
    .catch(undefined),
  action: z
    .enum(AUDIT_ACTIONS)
    .or(z.literal(''))
    .transform((value) => (value === '' ? undefined : value))
    .catch(undefined),
  entityType: z
    .enum(AUDIT_ENTITY_TYPES)
    .or(z.literal(''))
    .transform((value) => (value === '' ? undefined : value))
    .catch(undefined),
  from: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((value) => (value ? value : undefined))
    .catch(undefined),
  to: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((value) => (value ? value : undefined))
    .catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});

export type AuditFilterValues = z.infer<typeof auditFilterSchema>;
