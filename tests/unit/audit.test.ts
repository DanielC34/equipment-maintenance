import { describe, it, expect, vi } from 'vitest';
import type { Role } from '@prisma/client';
import {
  PERMISSIONS,
  roleHasPermission,
  hasPermission,
} from '@/lib/permissions';
import { describeAudit } from '@/server/audit';
import { auditFilterSchema } from '@/lib/validations';

vi.mock('@/lib/prisma', () => ({ default: {} }));

const ROLES: Role[] = [
  'ADMINISTRATOR',
  'SUPERVISOR',
  'TECHNICIAN',
  'OPERATOR',
  'PLANT_MANAGER',
  'RELIABILITY_ENGINEER',
];

describe('auditView permission', () => {
  it('restricts auditView to ADMINISTRATOR only', () => {
    for (const role of ROLES) {
      expect(roleHasPermission(role, PERMISSIONS.auditView)).toBe(
        role === 'ADMINISTRATOR'
      );
    }
  });

  it('enforces auditView through hasPermission with a session', () => {
    for (const role of ROLES) {
      expect(
        hasPermission({ user: { id: 'u1', role } }, PERMISSIONS.auditView)
      ).toBe(role === 'ADMINISTRATOR');
    }
    expect(hasPermission(null, PERMISSIONS.auditView)).toBe(false);
    expect(
      hasPermission({ user: { id: 'u1' } }, PERMISSIONS.auditView)
    ).toBe(false);
  });
});

describe('describeAudit', () => {
  it('builds human-readable descriptions for every action', () => {
    expect(
      describeAudit({
        action: 'CREATE',
        entityType: 'EQUIPMENT',
        entityLabel: 'CNC Milling Machine',
      })
    ).toBe('created equipment "CNC Milling Machine"');
    expect(
      describeAudit({
        action: 'UPDATE',
        entityType: 'EQUIPMENT',
        entityLabel: 'CNC Milling Machine',
      })
    ).toBe('updated equipment "CNC Milling Machine"');
    expect(
      describeAudit({
        action: 'START',
        entityType: 'MAINTENANCE_TASK',
        entityLabel: 'Replace Conveyor Motor',
      })
    ).toBe('started maintenance task "Replace Conveyor Motor"');
    expect(
      describeAudit({
        action: 'COMPLETE',
        entityType: 'MAINTENANCE_TASK',
        entityLabel: 'Robot Arm Lubrication',
      })
    ).toBe('completed maintenance task "Robot Arm Lubrication"');
    expect(
      describeAudit({
        action: 'RESOLVE',
        entityType: 'DOWNTIME_EVENT',
        entityLabel: 'Hydraulic Press · HPR-004',
      })
    ).toBe('resolved downtime event "Hydraulic Press · HPR-004"');
    expect(
      describeAudit({
        action: 'DELETE',
        entityType: 'EQUIPMENT',
        entityLabel: 'CNC Milling Machine',
      })
    ).toBe('deleted equipment "CNC Milling Machine"');
  });

  it('falls back to the entity type label when no label is stored', () => {
    expect(
      describeAudit({
        action: 'UPDATE',
        entityType: 'MAINTENANCE_RECORD',
        entityLabel: null,
      })
    ).toBe('updated maintenance record "maintenance record"');
  });
});

describe('auditFilterSchema', () => {
  it('parses an empty query into defaults', () => {
    const parsed = auditFilterSchema.parse({});
    expect(parsed.q).toBe('');
    expect(parsed.page).toBe(1);
    expect(parsed.actorId).toBeUndefined();
    expect(parsed.action).toBeUndefined();
    expect(parsed.entityType).toBeUndefined();
    expect(parsed.from).toBeUndefined();
    expect(parsed.to).toBeUndefined();
  });

  it('normalizes empty select values to undefined', () => {
    const parsed = auditFilterSchema.parse({
      actorId: '',
      action: '',
      entityType: '',
      from: '',
      to: '',
    });
    expect(parsed.actorId).toBeUndefined();
    expect(parsed.action).toBeUndefined();
    expect(parsed.entityType).toBeUndefined();
    expect(parsed.from).toBeUndefined();
    expect(parsed.to).toBeUndefined();
  });

  it('keeps valid enum filters', () => {
    const parsed = auditFilterSchema.parse({
      action: 'START',
      entityType: 'DOWNTIME_EVENT',
    });
    expect(parsed.action).toBe('START');
    expect(parsed.entityType).toBe('DOWNTIME_EVENT');
  });

  it('accepts the DELETE audit action', () => {
    const parsed = auditFilterSchema.parse({ action: 'DELETE' });
    expect(parsed.action).toBe('DELETE');
  });

  it('coerces an invalid enum filter to undefined instead of failing', () => {
    const parsed = auditFilterSchema.parse({ action: 'NOT_A_REAL_ACTION' });
    expect(parsed.action).toBeUndefined();
  });

  it('coerces page strings to integers and floors bad values at 1', () => {
    expect(auditFilterSchema.parse({ page: '3' }).page).toBe(3);
    expect(auditFilterSchema.parse({ page: '0' }).page).toBe(1);
    expect(auditFilterSchema.parse({ page: 'junk' }).page).toBe(1);
  });

  it('trims the free-text search term', () => {
    const parsed = auditFilterSchema.parse({ q: '  coolant  ' });
    expect(parsed.q).toBe('coolant');
  });
});