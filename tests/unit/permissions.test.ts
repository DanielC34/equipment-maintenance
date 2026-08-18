import { describe, it, expect } from 'vitest';
import {
  PERMISSIONS,
  roleHasPermission,
  hasPermission,
  type Permission,
} from '@/lib/permissions';
import type { Role } from '@prisma/client';

const ROLES: Role[] = [
  'ADMINISTRATOR',
  'SUPERVISOR',
  'TECHNICIAN',
  'OPERATOR',
  'PLANT_MANAGER',
  'RELIABILITY_ENGINEER',
];

const ALL_ACCESS = Object.values(PERMISSIONS);

const EXPECTED: Record<Role, Permission[]> = {
  ADMINISTRATOR: ALL_ACCESS,
  SUPERVISOR: [
    PERMISSIONS.appView,
    PERMISSIONS.equipmentView,
    PERMISSIONS.equipmentCreate,
    PERMISSIONS.equipmentEdit,
    PERMISSIONS.equipmentDelete,
    PERMISSIONS.maintenanceView,
    PERMISSIONS.maintenanceSchedule,
    PERMISSIONS.maintenanceComplete,
    PERMISSIONS.reportsView,
  ],
  TECHNICIAN: [
    PERMISSIONS.appView,
    PERMISSIONS.equipmentView,
    PERMISSIONS.maintenanceView,
    PERMISSIONS.maintenanceComplete,
    PERMISSIONS.downtimeResolve,
  ],
  OPERATOR: [
    PERMISSIONS.appView,
    PERMISSIONS.equipmentView,
    PERMISSIONS.downtimeRecord,
  ],
  PLANT_MANAGER: [
    PERMISSIONS.appView,
    PERMISSIONS.equipmentView,
    PERMISSIONS.reportsView,
  ],
  RELIABILITY_ENGINEER: [
    PERMISSIONS.appView,
    PERMISSIONS.equipmentView,
    PERMISSIONS.reportsView,
  ],
};

describe('roleHasPermission', () => {
  it.each(ROLES)('%s: grants exactly the expected permission set', (role) => {
    for (const permission of Object.values(PERMISSIONS)) {
      const expected = EXPECTED[role].includes(permission);
      expect(roleHasPermission(role, permission)).toBe(expected);
    }
  });

  it('grants appView and equipmentView to every role', () => {
    for (const role of ROLES) {
      expect(roleHasPermission(role, PERMISSIONS.appView)).toBe(true);
      expect(roleHasPermission(role, PERMISSIONS.equipmentView)).toBe(true);
    }
  });

  it('defaults OPERATOR to the least-privilege set', () => {
    expect(
      Object.values(PERMISSIONS).filter((p) => roleHasPermission('OPERATOR', p))
    ).toEqual(EXPECTED.OPERATOR);
  });

  it('gives ADMINISTRATOR every permission', () => {
    for (const permission of Object.values(PERMISSIONS)) {
      expect(roleHasPermission('ADMINISTRATOR', permission)).toBe(true);
    }
  });
});

describe('hasPermission', () => {
  it('returns false for a null session', () => {
    for (const permission of Object.values(PERMISSIONS)) {
      expect(hasPermission(null, permission)).toBe(false);
    }
  });

  it('returns false for a session without a user role', () => {
    const sessions = [
      {},
      { user: {} },
      { user: { id: 'u1' } },
    ];
    for (const session of sessions) {
      for (const permission of Object.values(PERMISSIONS)) {
        expect(hasPermission(session, permission)).toBe(false);
      }
    }
  });

  it.each(ROLES)('%s: is consistent with roleHasPermission', (role) => {
    const session = { user: { id: 'u1', role } };
    for (const permission of Object.values(PERMISSIONS)) {
      expect(hasPermission(session, permission)).toBe(
        roleHasPermission(role, permission)
      );
    }
  });
});