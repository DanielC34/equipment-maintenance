import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { setSession, invoke, type ActionResult } from './mocks';
import { authOptions } from '@/auth';
import { listUsers } from '@/server/users';
import {
  listAssignableUsers,
  userCanBeAssigned,
} from '@/server/maintenance';
import {
  createUser as createUserAction,
  updateUser,
} from '@/server/actions/users';
import type {
  UserCreateValues,
  UserUpdateValues,
} from '@/lib/validations';
import {
  cleanup,
  unique,
} from './fixtures';
import type { Role } from '@prisma/client';

const PROBE = 'probe_users';

const tracked = {
  userIds: [] as string[],
};

let actingAdmin: string;
let technician: string;
let operator: string;

let userSeq = 0;

async function directUser(role: Role, name: string): Promise<string> {
  userSeq += 1;
  const user = await prisma.user.create({
    data: {
      name,
      email: `${PROBE}_${userSeq}_${role.toLowerCase()}@emms.dev`,
      password: 'not-used',
      role,
    },
  });
  return user.id;
}

function redirectUrl(result: ActionResult<unknown>): string | undefined {
  return result.kind === 'redirect' ? result.url : undefined;
}

function createValues(
  overrides: Partial<UserCreateValues> = {}
): UserCreateValues {
  return {
    name: `${PROBE}_operator`,
    email: unique('usr') + '@emms.dev',
    role: 'OPERATOR',
    password: 'probe-password-123',
    ...overrides,
  };
}

function updateValues(
  overrides: Partial<UserUpdateValues> = {}
): UserUpdateValues {
  return { role: 'SUPERVISOR', active: true, ...overrides };
}

async function auditRowsForUser(userId: string) {
  return prisma.auditLog.findMany({
    where: { entityType: 'USER', entityId: userId },
    orderBy: { createdAt: 'asc' },
  });
}

async function setUserActive(userId: string, active: boolean): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { active } });
}

async function allActiveAdminsExcept(userId: string) {
  return prisma.user.findMany({
    where: { role: 'ADMINISTRATOR', active: true, id: { not: userId } },
    select: { id: true },
  });
}

beforeAll(async () => {
  actingAdmin = await directUser('ADMINISTRATOR', `${PROBE}_admin`);
  technician = await directUser('TECHNICIAN', `${PROBE}_tech`);
  operator = await directUser('OPERATOR', `${PROBE}_operator`);
  tracked.userIds.push(actingAdmin, technician, operator);

  setSession({
    id: actingAdmin,
    name: 'Users Admin Probe',
    email: 'users.admin.probe@test.local',
    role: 'ADMINISTRATOR',
  });
});

afterAll(async () => {
  const seedAdmin = await prisma.user.findUnique({
    where: { email: 'admin@emms.dev' },
    select: { id: true, active: true },
  });
  if (seedAdmin && !seedAdmin.active) {
    await setUserActive(seedAdmin.id, true);
  }
  await cleanup({ userIds: tracked.userIds });
});

describe('listUsers', () => {
  it('searches by name and filters by role and status', async () => {
    const found = await listUsers({ q: PROBE, page: 1 });
    const ids = found.items.map((u) => u.id);
    expect(ids).toContain(actingAdmin);
    expect(ids).toContain(technician);
    expect(ids).toContain(operator);

    const techs = await listUsers({ q: PROBE, role: 'TECHNICIAN', page: 1 });
    expect(techs.items.map((u) => u.id)).toEqual([technician]);
    expect(techs.total).toBe(1);

    const inactive = await listUsers({ q: PROBE, active: false, page: 1 });
    expect(inactive.items.map((u) => u.id)).not.toContain(actingAdmin);
  });

  it('paginates and does not expose password hashes', async () => {
    for (let i = 0; i < 22; i++) {
      const id = await directUser('OPERATOR', `${PROBE}_page_${i}`);
      tracked.userIds.push(id);
    }
    const page1 = await listUsers({ q: `${PROBE}_page_`, page: 1 });
    expect(page1.items).toHaveLength(20);
    const page2 = await listUsers({ q: `${PROBE}_page_`, page: 2 });
    expect(page2.items.length).toBeGreaterThan(0);
    expect(page2.items.length).toBeLessThanOrEqual(20);
    expect(page1.total).toBeGreaterThan(20);
    expect(page1.totalPages).toBeGreaterThan(1);

    for (const user of page1.items) {
      expect(user).not.toHaveProperty('password');
    }
  });
});

describe('createUser action', () => {
  it('creates an active user with a hashed password and an audit row', async () => {
    const values = createValues();
    const result = await invoke(() => createUserAction(values));

    expect(result.kind).toBe('redirect');
    const id = redirectUrl(result)?.split('/').pop();
    expect(id).toBeTruthy();
    tracked.userIds.push(id as string);

    const row = await prisma.user.findUnique({ where: { id } });
    expect(row).not.toBeNull();
    expect(row?.email).toBe(values.email);
    expect(row?.role).toBe('OPERATOR');
    expect(row?.active).toBe(true);
    expect(row?.password).not.toBe(values.password);
    const matches = await bcrypt.compare(values.password, row!.password!);
    expect(matches).toBe(true);

    const audits = await auditRowsForUser(id as string);
    expect(audits).toHaveLength(1);
    expect(audits[0].action).toBe('CREATE');
    expect(audits[0].actorId).toBe(actingAdmin);
    expect(audits[0].entityLabel).toBe(values.name);
  });

  it('normalizes the email, trims the name, and ignores client-supplied active', async () => {
    const values = createValues({
      name: `  ${PROBE}_mixed  `,
      email: '  MixedCase@EMMS.dev  ',
    });
    const result = await invoke(() => {
      const attempted: UserCreateValues & { active: boolean } = {
        ...(values as UserCreateValues),
        active: false,
      };
      return createUserAction(attempted);
    });
    expect(result.kind).toBe('redirect');
    const id = redirectUrl(result)?.split('/').pop();
    tracked.userIds.push(id as string);

    const row = await prisma.user.findUnique({ where: { id } });
    expect(row?.name).toBe(`${PROBE}_mixed`);
    expect(row?.email).toBe('mixedcase@emms.dev');
    expect(row?.active).toBe(true);
  });

  it('rejects a duplicate email without creating a user or audit row', async () => {
    const values = createValues();
    await invoke(() => createUserAction(values));
    const existing = await prisma.user.findUnique({
      where: { email: values.email },
    });
    expect(existing).not.toBeNull();
    tracked.userIds.push(existing!.id);

    const before = await prisma.auditLog.count({
      where: { entityType: 'USER' },
    });
    const duplicate = await createUserAction(values);
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.error).toContain('already exists');
    }
    const after = await prisma.auditLog.count({
      where: { entityType: 'USER' },
    });
    expect(after).toBe(before);
  });

  it('rejects invalid input without creating a user', async () => {
    const invalid = createValues({
      email: 'not-an-email',
      password: 'short',
    });
    const result = await createUserAction(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('highlighted fields');
    }
    const row = await prisma.user.findUnique({
      where: { email: invalid.email },
    });
    expect(row).toBeNull();
  });
});

describe('updateUser action', () => {
  it('changes the role and writes an audit row', async () => {
    const result = await updateUser(technician, updateValues());
    expect(result).toEqual({ ok: true });

    const row = await prisma.user.findUnique({ where: { id: technician } });
    expect(row?.role).toBe('SUPERVISOR');

    const audits = await auditRowsForUser(technician);
    expect(audits).toHaveLength(1);
    expect(audits[0].action).toBe('UPDATE');
    expect(audits[0].actorId).toBe(actingAdmin);
    expect(audits[0].entityLabel).toBe(`${PROBE}_tech`);
  });

  it('deactivation removes a user from assignment lists; reactivation restores them', async () => {
    await updateUser(technician, { role: 'TECHNICIAN', active: true });

    const deactivated = await updateUser(technician, {
      role: 'TECHNICIAN',
      active: false,
    });
    expect(deactivated).toEqual({ ok: true });
    const row = await prisma.user.findUnique({ where: { id: technician } });
    expect(row?.active).toBe(false);

    const assignable = await listAssignableUsers();
    expect(assignable.map((u) => u.id)).not.toContain(technician);
    expect(await userCanBeAssigned(technician)).toBe(false);

    const restored = await updateUser(technician, {
      role: 'TECHNICIAN',
      active: true,
    });
    expect(restored).toEqual({ ok: true });
    expect(await userCanBeAssigned(technician)).toBe(true);
  });

  it('blocks deactivating your own account and writes no audit row', async () => {
    const before = await prisma.auditLog.count({
      where: { entityType: 'USER' },
    });
    const result = await updateUser(actingAdmin, {
      role: 'ADMINISTRATOR',
      active: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('You cannot deactivate your own account.');
    }
    const row = await prisma.user.findUnique({ where: { id: actingAdmin } });
    expect(row?.active).toBe(true);
    const after = await prisma.auditLog.count({
      where: { entityType: 'USER' },
    });
    expect(after).toBe(before);
  });

  it('blocks removing your own administrator role and writes no audit row', async () => {
    const before = await prisma.auditLog.count({
      where: { entityType: 'USER' },
    });
    const result = await updateUser(actingAdmin, {
      role: 'OPERATOR',
      active: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(
        'You cannot remove your own administrator role.'
      );
    }
    const row = await prisma.user.findUnique({ where: { id: actingAdmin } });
    expect(row?.role).toBe('ADMINISTRATOR');
    const after = await prisma.auditLog.count({
      where: { entityType: 'USER' },
    });
    expect(after).toBe(before);
  });

  it('allows deactivating another active administrator', async () => {
    const otherAdmin = await directUser('ADMINISTRATOR', `${PROBE}_admin2`);
    tracked.userIds.push(otherAdmin);

    const result = await updateUser(otherAdmin, {
      role: 'ADMINISTRATOR',
      active: false,
    });
    expect(result).toEqual({ ok: true });
    const row = await prisma.user.findUnique({ where: { id: otherAdmin } });
    expect(row?.active).toBe(false);
    await updateUser(otherAdmin, {
      role: 'ADMINISTRATOR',
      active: true,
    });
  });

  it('blocks demoting the last active administrator', async () => {
    const lastAdmin = await directUser('ADMINISTRATOR', `${PROBE}_last_admin`);
    tracked.userIds.push(lastAdmin);

    const others = await allActiveAdminsExcept(lastAdmin);
    try {
      for (const other of others) {
        await setUserActive(other.id, false);
      }
      // The mocked requirePermission lets any session act; using a non-admin
      // session isolates the last-active-administrator rule (a self-edit is
      // already blocked by the self-rule instead).
      setSession({
        id: operator,
        name: 'Operator Probe',
        email: 'operator.probe@test.local',
        role: 'OPERATOR',
      });

      const demote = await updateUser(lastAdmin, {
        role: 'OPERATOR',
        active: true,
      });
      expect(demote.ok).toBe(false);
      if (!demote.ok) {
        expect(demote.error).toBe(
          'The system must keep at least one active administrator.'
        );
      }

      const deactivate = await updateUser(lastAdmin, {
        role: 'ADMINISTRATOR',
        active: false,
      });
      expect(deactivate.ok).toBe(false);
      if (!deactivate.ok) {
        expect(deactivate.error).toBe(
          'The system must keep at least one active administrator.'
        );
      }

      const row = await prisma.user.findUnique({
        where: { id: lastAdmin },
      });
      expect(row?.role).toBe('ADMINISTRATOR');
      expect(row?.active).toBe(true);
    } finally {
      for (const other of others) {
        await setUserActive(other.id, true);
      }
      setSession({
        id: actingAdmin,
        name: 'Users Admin Probe',
        email: 'users.admin.probe@test.local',
        role: 'ADMINISTRATOR',
      });
    }
  });

  it('returns an error for a missing user and writes no audit row', async () => {
    const before = await prisma.auditLog.count({
      where: { entityType: 'USER' },
    });
    const result = await updateUser('missing-user-id', updateValues());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('This user no longer exists.');
    }
    const after = await prisma.auditLog.count({
      where: { entityType: 'USER' },
    });
    expect(after).toBe(before);
  });

  it('rejects a non-boolean active value via the schema', async () => {
    const result = await updateUser(technician, {
      role: 'TECHNICIAN',
      active: 'yes' as unknown as boolean,
    });
    expect(result.ok).toBe(false);
  });
});

describe('login gating', () => {
  it('rejects inactive users while allowing active users', async () => {
    const loginUser = await directUser('TECHNICIAN', `${PROBE}_login`);
    tracked.userIds.push(loginUser);
    const password = 'probe-login-123';
    await prisma.user.update({
      where: { id: loginUser },
      data: { password: await bcrypt.hash(password, 10) },
    });

    const provider = authOptions.providers[0] as {
      options: {
        authorize: (credentials: {
          email: string;
          password: string;
        }) => Promise<{ id: string } | null>;
      };
    };

    const email = await prisma.user
      .findUnique({ where: { id: loginUser }, select: { email: true } })
      .then((u) => u!.email);

    const ok = await provider.options.authorize({ email, password });
    expect(ok?.id).toBe(loginUser);

    await updateUser(loginUser, { role: 'TECHNICIAN', active: false });
    const denied = await provider.options.authorize({ email, password });
    expect(denied).toBeNull();

    await updateUser(loginUser, { role: 'TECHNICIAN', active: true });
    const restored = await provider.options.authorize({ email, password });
    expect(restored?.id).toBe(loginUser);
  });
});