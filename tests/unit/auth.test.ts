import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import bcrypt from 'bcryptjs';

const prismaMocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: prismaMocks.userFindUnique,
    },
  },
}));

import { authOptions } from '@/auth';
import {
  AUTH_INFRASTRUCTURE_LOG_MESSAGE,
  AUTH_SERVICE_UNAVAILABLE_CODE,
  AUTH_SERVICE_UNAVAILABLE_MESSAGE,
  getCredentialsErrorMessage,
  INVALID_CREDENTIALS_MESSAGE,
} from '@/lib/auth-errors';

const EMAIL = 'operator@example.test';
const PASSWORD = 'unit-test-only-password';

let passwordHash: string;

const credentials = (password = PASSWORD) => ({ email: EMAIL, password });

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    name: 'Test Operator',
    email: EMAIL,
    role: 'OPERATOR',
    active: true,
    password: passwordHash,
    ...overrides,
  };
}

function getAuthorize() {
  const provider = authOptions.providers[0] as {
    options: {
      authorize: (input: {
        email: string;
        password: string;
      }) => Promise<{ id: string; name: string; email: string } | null>;
    };
  };
  return provider.options.authorize;
}

describe('credentials authorization', () => {
  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 10);
  });

  beforeEach(() => {
    prismaMocks.userFindUnique.mockReset();
    prismaMocks.userFindUnique.mockResolvedValue(user());
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects a nonexistent user as an ordinary credential failure', async () => {
    prismaMocks.userFindUnique.mockResolvedValue(null);

    await expect(getAuthorize()(credentials())).resolves.toBeNull();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('rejects an inactive user as an ordinary credential failure', async () => {
    prismaMocks.userFindUnique.mockResolvedValue(user({ active: false }));

    await expect(getAuthorize()(credentials())).resolves.toBeNull();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('rejects an incorrect password as an ordinary credential failure', async () => {
    await expect(
      getAuthorize()(credentials('incorrect-test-password'))
    ).resolves.toBeNull();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('logs a safe category and propagates a generic error for Prisma failures', async () => {
    const prismaFailure = new Error('synthetic database detail');
    prismaMocks.userFindUnique.mockRejectedValue(prismaFailure);

    await expect(getAuthorize()(credentials())).rejects.toThrow(
      AUTH_SERVICE_UNAVAILABLE_CODE
    );
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(AUTH_INFRASTRUCTURE_LOG_MESSAGE);
    expect(console.error).not.toHaveBeenCalledWith(prismaFailure);
  });

  it('authenticates an active user with a valid password', async () => {
    await expect(getAuthorize()(credentials())).resolves.toEqual({
      id: 'user-1',
      name: 'Test Operator',
      email: EMAIL,
      role: 'OPERATOR',
    });
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('credentials error messages', () => {
  it('keeps credential failures generic and maps other auth errors to a safe service message', () => {
    expect(getCredentialsErrorMessage('CredentialsSignin')).toBe(
      INVALID_CREDENTIALS_MESSAGE
    );
    expect(getCredentialsErrorMessage(AUTH_SERVICE_UNAVAILABLE_CODE)).toBe(
      AUTH_SERVICE_UNAVAILABLE_MESSAGE
    );
    expect(getCredentialsErrorMessage('Configuration')).toBe(
      AUTH_SERVICE_UNAVAILABLE_MESSAGE
    );
  });
});
