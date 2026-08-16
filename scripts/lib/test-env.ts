import 'dotenv/config';

const TEST_DB_NAME = 'emms_test';

export function getTestDatabaseUrl(): string {
  const base = process.env.DATABASE_URL;
  if (!base) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and configure PostgreSQL.'
    );
  }
  const url = new URL(base);
  url.pathname = `/${TEST_DB_NAME}`;
  return url.toString();
}

export function getServerDatabaseUrl(): string {
  const url = new URL(getTestDatabaseUrl());
  url.pathname = '/postgres';
  return url.toString();
}

export function getTestDatabaseName(): string {
  return TEST_DB_NAME;
}