import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  equipmentFormSchema,
  equipmentFilterSchema,
  maintenanceTaskFormSchema,
  maintenanceFilterSchema,
  maintenancePartSchema,
  maintenanceCompletionSchema,
  maintenanceHistoryFilterSchema,
  downtimeEventFormSchema,
  downtimeEventResolveSchema,
  downtimeFilterSchema,
  reportFilterSchema,
} from '@/lib/validations';

function localDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const futureDate = () => localDateTime(new Date(Date.now() + 24 * 3600 * 1000));
const pastDate = () => localDateTime(new Date(Date.now() - 24 * 3600 * 1000));

describe('loginSchema', () => {
  it('accepts a valid email and password', () => {
    const result = loginSchema.safeParse({
      email: 'admin@emms.dev',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.find((i) => i.path[0] === 'email')?.message).toBe(
        'Enter a valid email address.'
      );
    }
  });

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({ email: 'a@b.dev', password: '' });
    expect(result.success).toBe(false);
  });

  it('trims the email before parsing', () => {
    const result = loginSchema.safeParse({
      email: '  admin@emms.dev  ',
      password: 'password123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('admin@emms.dev');
    }
  });
});

describe('equipmentFormSchema', () => {
  const valid = {
    name: 'CNC Milling Machine',
    assetNumber: 'CNC-001',
    description: '5-axis mill',
    location: 'Section A',
    status: 'OPERATIONAL',
    criticality: 'High',
    factoryId: 'factory-1',
  };

  it('accepts a valid submission', () => {
    expect(equipmentFormSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts optional fields omitted', () => {
    const minimal: Partial<typeof valid> = { ...valid };
    delete minimal.description;
    delete minimal.criticality;
    expect(equipmentFormSchema.safeParse(minimal).success).toBe(true);
  });

  it.each(['name', 'assetNumber', 'location', 'factoryId'])(
    'rejects a missing required field: %s',
    (field) => {
      const result = equipmentFormSchema.safeParse({ ...valid, [field]: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) => i.path[0] === field)
        ).toBe(true);
      }
    }
  );

  it('enforces max lengths', () => {
    expect(
      equipmentFormSchema.safeParse({ ...valid, name: 'x'.repeat(121) }).success
    ).toBe(false);
    expect(
      equipmentFormSchema.safeParse({
        ...valid,
        assetNumber: 'x'.repeat(61),
      }).success
    ).toBe(false);
    expect(
      equipmentFormSchema.safeParse({
        ...valid,
        description: 'x'.repeat(501),
      }).success
    ).toBe(false);
    expect(
      equipmentFormSchema.safeParse({
        ...valid,
        location: 'x'.repeat(121),
      }).success
    ).toBe(false);
    expect(
      equipmentFormSchema.safeParse({
        ...valid,
        criticality: 'x'.repeat(41),
      }).success
    ).toBe(false);
  });

  it('rejects an invalid status enum value', () => {
    expect(
      equipmentFormSchema.safeParse({ ...valid, status: 'BROKEN' }).success
    ).toBe(false);
  });

  it('trims whitespace-only required fields to invalid', () => {
    expect(
      equipmentFormSchema.safeParse({ ...valid, name: '   ' }).success
    ).toBe(false);
  });
});

describe('equipmentFilterSchema', () => {
  it('provides defaults for an empty query', () => {
    const parsed = equipmentFilterSchema.parse({});
    expect(parsed.q).toBe('');
    expect(parsed.status).toBeUndefined();
    expect(parsed.page).toBe(1);
  });

  it('coerces and clamps the page number', () => {
    expect(equipmentFilterSchema.parse({ page: '3' }).page).toBe(3);
    expect(equipmentFilterSchema.parse({ page: '0' }).page).toBe(1);
    expect(equipmentFilterSchema.parse({ page: 'abc' }).page).toBe(1);
  });

  it('normalises an empty status to undefined', () => {
    expect(equipmentFilterSchema.parse({ status: '' }).status).toBeUndefined();
  });

  it('keeps a valid status and caps an oversized query', () => {
    expect(
      equipmentFilterSchema.parse({ status: 'UNDER_MAINTENANCE' }).status
    ).toBe('UNDER_MAINTENANCE');
    expect(equipmentFilterSchema.parse({ q: 'x'.repeat(500) }).q).toBe('');
  });
});

describe('maintenanceTaskFormSchema', () => {
  const valid = () => ({
    title: 'Monthly Calibration',
    description: 'Calibrate the machine',
    equipmentId: 'equipment-1',
    assignedUserId: 'user-1',
    scheduledDate: futureDate(),
    priority: 'MEDIUM',
  });

  it('accepts a valid future-dated task', () => {
    expect(maintenanceTaskFormSchema.safeParse(valid()).success).toBe(true);
  });

  it('rejects a scheduled date in the past', () => {
    const result = maintenanceTaskFormSchema.safeParse({
      ...valid(),
      scheduledDate: pastDate(),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === 'scheduledDate')?.message
      ).toBe('Scheduled date cannot be in the past.');
    }
  });

  it('rejects a malformed scheduled date', () => {
    const result = maintenanceTaskFormSchema.safeParse({
      ...valid(),
      scheduledDate: 'not-a-date',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === 'scheduledDate')?.message
      ).toBe('Enter a valid date and time.');
    }
  });

  it('rejects an empty scheduled date', () => {
    const result = maintenanceTaskFormSchema.safeParse({
      ...valid(),
      scheduledDate: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === 'scheduledDate')?.message
      ).toBe('Select a scheduled date.');
    }
  });

  it('rejects missing title, equipment, and assignee', () => {
    expect(
      maintenanceTaskFormSchema.safeParse({ ...valid(), title: '' }).success
    ).toBe(false);
    expect(
      maintenanceTaskFormSchema.safeParse({
        ...valid(),
        equipmentId: '',
      }).success
    ).toBe(false);
    expect(
      maintenanceTaskFormSchema.safeParse({
        ...valid(),
        assignedUserId: '',
      }).success
    ).toBe(false);
  });

  it('enforces title/description length and priority enum', () => {
    expect(
      maintenanceTaskFormSchema.safeParse({
        ...valid(),
        title: 'x'.repeat(201),
      }).success
    ).toBe(false);
    expect(
      maintenanceTaskFormSchema.safeParse({
        ...valid(),
        description: 'x'.repeat(2001),
      }).success
    ).toBe(false);
    expect(
      maintenanceTaskFormSchema.safeParse({
        ...valid(),
        priority: 'URGENT',
      }).success
    ).toBe(false);
  });
});

describe('maintenanceFilterSchema', () => {
  it('provides defaults', () => {
    const parsed = maintenanceFilterSchema.parse({});
    expect(parsed.q).toBe('');
    expect(parsed.status).toBeUndefined();
    expect(parsed.priority).toBeUndefined();
    expect(parsed.page).toBe(1);
  });

  it('passes valid status/priority and clamps page', () => {
    const parsed = maintenanceFilterSchema.parse({
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      page: '2',
    });
    expect(parsed.status).toBe('IN_PROGRESS');
    expect(parsed.priority).toBe('HIGH');
    expect(parsed.page).toBe(2);
  });

  it('catches invalid enum values back to undefined', () => {
    expect(maintenanceFilterSchema.parse({ status: 'NOPE' }).status).toBeUndefined();
    expect(
      maintenanceFilterSchema.parse({ priority: 'NOPE' }).priority
    ).toBeUndefined();
  });
});

describe('maintenancePartSchema', () => {
  it('accepts a valid part', () => {
    expect(
      maintenancePartSchema.safeParse({ name: 'Coolant Pump', quantity: 1 })
        .success
    ).toBe(true);
  });

  it('requires a name with max length 120', () => {
    expect(maintenancePartSchema.safeParse({ name: '', quantity: 1 }).success).toBe(
      false
    );
    expect(
      maintenancePartSchema.safeParse({ name: 'x'.repeat(121), quantity: 1 })
        .success
    ).toBe(false);
  });

  it('enforces integer quantity within 1..100000', () => {
    expect(
      maintenancePartSchema.safeParse({ name: 'Part', quantity: 0 }).success
    ).toBe(false);
    expect(
      maintenancePartSchema.safeParse({ name: 'Part', quantity: 100001 }).success
    ).toBe(false);
    expect(
      maintenancePartSchema.safeParse({ name: 'Part', quantity: 1.5 }).success
    ).toBe(false);
    expect(
      maintenancePartSchema.safeParse({ name: 'Part', quantity: 'abc' }).success
    ).toBe(false);
  });
});

describe('maintenanceCompletionSchema', () => {
  it('accepts a valid completion with parts', () => {
    const result = maintenanceCompletionSchema.safeParse({
      description: 'Replaced the pump',
      notes: 'Pump was leaking',
      parts: [{ name: 'Coolant Pump', quantity: 1 }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts an empty parts array', () => {
    expect(
      maintenanceCompletionSchema.safeParse({
        description: 'Inspection only',
        notes: '',
        parts: [],
      }).success
    ).toBe(true);
  });

  it('requires a description and rejects an oversized parts list', () => {
    expect(
      maintenanceCompletionSchema.safeParse({
        description: '',
        notes: '',
        parts: [],
      }).success
    ).toBe(false);
    const manyParts = Array.from({ length: 51 }, (_, i) => ({
      name: `Part ${i}`,
      quantity: 1,
    }));
    expect(
      maintenanceCompletionSchema.safeParse({
        description: 'x',
        notes: '',
        parts: manyParts,
      }).success
    ).toBe(false);
  });

  it('enforces notes max length', () => {
    expect(
      maintenanceCompletionSchema.safeParse({
        description: 'x',
        notes: 'x'.repeat(2001),
        parts: [],
      }).success
    ).toBe(false);
  });
});

describe('maintenanceHistoryFilterSchema', () => {
  it('normalises empty inputs to undefined and defaults the page', () => {
    const parsed = maintenanceHistoryFilterSchema.parse({});
    expect(parsed.equipmentId).toBeUndefined();
    expect(parsed.technicianId).toBeUndefined();
    expect(parsed.from).toBeUndefined();
    expect(parsed.to).toBeUndefined();
    expect(parsed.page).toBe(1);
  });

  it('keeps valid filter values', () => {
    const parsed = maintenanceHistoryFilterSchema.parse({
      equipmentId: 'eq-1',
      technicianId: 'tech-1',
      from: '2026-08-01',
      to: '2026-08-10',
      page: '4',
    });
    expect(parsed.equipmentId).toBe('eq-1');
    expect(parsed.technicianId).toBe('tech-1');
    expect(parsed.from).toBe('2026-08-01');
    expect(parsed.to).toBe('2026-08-10');
    expect(parsed.page).toBe(4);
  });

  it('treats blank pipeline values as undefined', () => {
    const parsed = maintenanceHistoryFilterSchema.parse({
      equipmentId: '',
      technicianId: '   ',
      from: '',
      to: '',
    });
    expect(parsed.equipmentId).toBeUndefined();
    expect(parsed.technicianId).toBeUndefined();
    expect(parsed.from).toBeUndefined();
    expect(parsed.to).toBeUndefined();
  });
});

describe('downtimeEventFormSchema', () => {
  const startedAt = futureDate();

  it('accepts an OPEN event with an empty endedAt', () => {
    const result = downtimeEventFormSchema.safeParse({
      equipmentId: 'equipment-1',
      startedAt,
      endedAt: '',
      reason: 'MECHANICAL',
      notes: 'Pump leaking',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.endedAt).toBe('');
    }
  });

  it('accepts a RESOLVED event whose end is after the start', () => {
    const started = new Date(Date.now() + 3600 * 1000);
    const result = downtimeEventFormSchema.safeParse({
      equipmentId: 'equipment-1',
      startedAt: localDateTime(started),
      endedAt: localDateTime(new Date(started.getTime() + 2 * 3600 * 1000)),
      reason: 'ELECTRICAL',
      notes: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an end date/time before the start', () => {
    const result = downtimeEventFormSchema.safeParse({
      equipmentId: 'equipment-1',
      startedAt,
      endedAt: pastDate(),
      reason: 'MECHANICAL',
      notes: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'endedAt');
      expect(issue?.message).toBe('Must be after the start time.');
    }
  });

  it('rejects an end date/time equal to the start', () => {
    const result = downtimeEventFormSchema.safeParse({
      equipmentId: 'equipment-1',
      startedAt,
      endedAt: startedAt,
      reason: 'MECHANICAL',
      notes: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid start and an invalid/absent end string', () => {
    expect(
      downtimeEventFormSchema.safeParse({
        equipmentId: 'equipment-1',
        startedAt: 'garbage',
        endedAt: '',
        reason: 'MECHANICAL',
        notes: '',
      }).success
    ).toBe(false);
    expect(
      downtimeEventFormSchema.safeParse({
        equipmentId: 'equipment-1',
        startedAt,
        endedAt: undefined,
        reason: 'MECHANICAL',
        notes: '',
      }).success
    ).toBe(false);
  });

  it('rejects missing equipment and an invalid reason', () => {
    expect(
      downtimeEventFormSchema.safeParse({
        equipmentId: '',
        startedAt,
        endedAt: '',
        reason: 'MECHANICAL',
        notes: '',
      }).success
    ).toBe(false);
    expect(
      downtimeEventFormSchema.safeParse({
        equipmentId: 'equipment-1',
        startedAt,
        endedAt: '',
        reason: 'SOLAR_FLARE',
        notes: '',
      }).success
    ).toBe(false);
  });
});

describe('downtimeEventResolveSchema', () => {
  it('accepts a valid end date/time', () => {
    expect(
      downtimeEventResolveSchema.safeParse({ endedAt: futureDate() }).success
    ).toBe(true);
  });

  it('rejects empty and malformed values', () => {
    expect(downtimeEventResolveSchema.safeParse({ endedAt: '' }).success).toBe(
      false
    );
    expect(downtimeEventResolveSchema.safeParse({ endedAt: 'garbage' }).success).toBe(
      false
    );
    expect(downtimeEventResolveSchema.safeParse({}).success).toBe(false);
  });
});

describe('downtimeFilterSchema', () => {
  it('provides defaults and normalises empty filters', () => {
    const parsed = downtimeFilterSchema.parse({});
    expect(parsed.equipmentId).toBeUndefined();
    expect(parsed.status).toBeUndefined();
    expect(parsed.from).toBeUndefined();
    expect(parsed.to).toBeUndefined();
    expect(parsed.page).toBe(1);
  });

  it('keeps valid filters and clamps page', () => {
    const parsed = downtimeFilterSchema.parse({
      equipmentId: 'eq-1',
      status: 'OPEN',
      from: '2026-08-01',
      to: '2026-08-10',
      page: '2',
    });
    expect(parsed.status).toBe('OPEN');
    expect(parsed.from).toBe('2026-08-01');
    expect(parsed.page).toBe(2);
  });
});

describe('reportFilterSchema', () => {
  it('defaults to no range', () => {
    const parsed = reportFilterSchema.parse({});
    expect(parsed.from).toBeUndefined();
    expect(parsed.to).toBeUndefined();
  });

  it('keeps a valid range and normalises blanks', () => {
    const parsed = reportFilterSchema.parse({ from: '2026-08-01', to: '' });
    expect(parsed.from).toBe('2026-08-01');
    expect(parsed.to).toBeUndefined();
  });
});