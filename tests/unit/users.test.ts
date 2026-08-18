import { describe, it, expect, vi } from 'vitest';
import type { Role } from '@prisma/client';
import {
  loginSchema,
  userCreateSchema,
  userUpdateSchema,
  userFilterSchema,
} from '@/lib/validations';
import { userUpdateConflict } from '@/server/user-safety';
import { PERMISSIONS, roleHasPermission } from '@/lib/permissions';

vi.mock('@/lib/prisma', () => ({ default: {} }));

const ROLES: Role[] = [
  'ADMINISTRATOR',
  'SUPERVISOR',
  'TECHNICIAN',
  'OPERATOR',
  'PLANT_MANAGER',
  'RELIABILITY_ENGINEER',
];

describe('loginSchema', () => {
  it('normalizes emails to lowercase for the lookup', () => {
    const result = loginSchema.safeParse({
      email: '  Admin@EMMS.dev  ',
      password: 'password123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('admin@emms.dev');
    }
  });
});

describe('userCreateSchema', () => {
  it('accepts a valid user, trims the name, and normalizes the email', () => {
    const result = userCreateSchema.safeParse({
      name: '  Jordan Smith  ',
      email: '  JORDAN.SMITH@EMMS.DEV  ',
      role: 'TECHNICIAN',
      password: 'password123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Jordan Smith');
      expect(result.data.email).toBe('jordan.smith@emms.dev');
      expect(result.data.role).toBe('TECHNICIAN');
    }
  });

  it('rejects an invalid email', () => {
    const result = userCreateSchema.safeParse({
      name: 'Jordan Smith',
      email: 'not-an-email',
      role: 'OPERATOR',
      password: 'password123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === 'email')?.message
      ).toBe('Enter a valid email address.');
    }
  });

  it('rejects an empty name', () => {
    const result = userCreateSchema.safeParse({
      name: '',
      email: 'a@b.dev',
      role: 'OPERATOR',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = userCreateSchema.safeParse({
      name: 'Jordan Smith',
      email: 'a@b.dev',
      role: 'OPERATOR',
      password: 'short',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === 'password')?.message
      ).toBe('Password must be at least 8 characters.');
    }
  });

  it('rejects an unknown role', () => {
    const result = userCreateSchema.safeParse({
      name: 'Jordan Smith',
      email: 'a@b.dev',
      role: 'SUPERADMIN',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });
});

describe('userUpdateSchema', () => {
  it('accepts a valid role and active status', () => {
    const result = userUpdateSchema.safeParse({
      role: 'SUPERVISOR',
      active: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ role: 'SUPERVISOR', active: false });
    }
  });

  it('rejects an unknown role', () => {
    expect(
      userUpdateSchema.safeParse({ role: 'OWNER', active: true }).success
    ).toBe(false);
  });

  it('rejects a non-boolean active value', () => {
    expect(
      userUpdateSchema.safeParse({ role: 'OPERATOR', active: 'yes' }).success
    ).toBe(false);
  });
});

describe('userFilterSchema', () => {
  it('parses an empty query into defaults', () => {
    const parsed = userFilterSchema.parse({});
    expect(parsed.q).toBe('');
    expect(parsed.role).toBeUndefined();
    expect(parsed.active).toBeUndefined();
    expect(parsed.page).toBe(1);
  });

  it('maps active filters to booleans', () => {
    expect(userFilterSchema.parse({ active: 'true' }).active).toBe(true);
    expect(userFilterSchema.parse({ active: 'false' }).active).toBe(false);
    expect(userFilterSchema.parse({ active: '' }).active).toBeUndefined();
    expect(userFilterSchema.parse({ active: 'junk' }).active).toBeUndefined();
  });

  it('keeps role filters and coerces the page', () => {
    const parsed = userFilterSchema.parse({ role: 'TECHNICIAN', page: '2' });
    expect(parsed.role).toBe('TECHNICIAN');
    expect(parsed.page).toBe(2);
    expect(userFilterSchema.parse({ page: '0' }).page).toBe(1);
  });

  it('trims the search term', () => {
    expect(userFilterSchema.parse({ q: '  jordan  ' }).q).toBe('jordan');
  });
});

describe('userUpdateConflict', () => {
  const actor = { id: 'a1', role: 'ADMINISTRATOR' as Role, active: true };
  const otherAdmin = { id: 'a2', role: 'ADMINISTRATOR' as Role, active: true };
  const tech = { id: 't1', role: 'TECHNICIAN' as Role, active: true };

  it('blocks deactivating your own account', () => {
    expect(
      userUpdateConflict(actor.id, actor, { ...actor, active: false }, 1)
    ).toBe('You cannot deactivate your own account.');
  });

  it('blocks removing your own administrator role', () => {
    expect(
      userUpdateConflict(actor.id, actor, { ...actor, role: 'OPERATOR' }, 1)
    ).toBe('You cannot remove your own administrator role.');
  });

  it('allows a self no-op edit', () => {
    expect(userUpdateConflict(actor.id, actor, actor, 1)).toBeNull();
  });

  it('blocks demoting another active administrator when none would remain', () => {
    expect(
      userUpdateConflict(
        actor.id,
        otherAdmin,
        { ...otherAdmin, role: 'OPERATOR' },
        0
      )
    ).toBe('The system must keep at least one active administrator.');
  });

  it('blocks deactivating another active administrator when none would remain', () => {
    expect(
      userUpdateConflict(
        actor.id,
        otherAdmin,
        { ...otherAdmin, active: false },
        0
      )
    ).toBe('The system must keep at least one active administrator.');
  });

  it('allows changing an active administrator when another remains', () => {
    expect(
      userUpdateConflict(actor.id, otherAdmin, { ...otherAdmin, role: 'SUPERVISOR' }, 1)
    ).toBeNull();
  });

  it('allows deactivating a non-administrator', () => {
    expect(
      userUpdateConflict(actor.id, tech, { ...tech, active: false }, 0)
    ).toBeNull();
  });

  it('allows changing a non-administrator role', () => {
    expect(
      userUpdateConflict(actor.id, tech, { ...tech, role: 'OPERATOR' }, 0)
    ).toBeNull();
  });
});

describe('usersManage permission', () => {
  it('is granted only to ADMINISTRATOR', () => {
    for (const role of ROLES) {
      expect(roleHasPermission(role, PERMISSIONS.usersManage)).toBe(
        role === 'ADMINISTRATOR'
      );
    }
  });
});