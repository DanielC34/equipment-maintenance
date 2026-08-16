import { vi } from 'vitest';

export class RedirectSignal extends Error {
  constructor(public readonly url: string) {
    super(`Redirected to ${url}`);
    this.name = 'RedirectSignal';
  }
}

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: () => {},
}));

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

let activeSession: SessionUser = {
  id: 'user-admin-test',
  name: 'Admin Test',
  email: 'admin.test@emms.dev',
  role: 'ADMINISTRATOR',
};

vi.mock('@/server/rbac', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/rbac')>();
  return {
    ...actual,
    requirePermission: vi.fn(async () => ({ user: activeSession })),
  };
});

export function setSession(user: SessionUser): void {
  activeSession = user;
}

export type ActionResult<T> =
  | { kind: 'redirect'; url: string }
  | { kind: 'result'; value: T };

export async function invoke<T>(
  fn: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    return { kind: 'result', value: await fn() };
  } catch (error) {
    if (error instanceof RedirectSignal) {
      return { kind: 'redirect', url: error.url };
    }
    throw error;
  }
}