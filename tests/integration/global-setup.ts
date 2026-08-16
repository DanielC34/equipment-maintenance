import { Client } from 'pg';
import {
  getServerDatabaseUrl,
  getTestDatabaseName,
  getTestDatabaseUrl,
} from '../../scripts/lib/test-env';

export default async function globalSetup(): Promise<void> {
  const server = new Client({ connectionString: getServerDatabaseUrl() });
  await server.connect();
  try {
    const result = await server.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [getTestDatabaseName()]
    );
    if (result.rowCount === 0) {
      throw new Error(
        `Test database "${getTestDatabaseName()}" does not exist. Run \`npm run test:db:setup\` first.`
      );
    }
  } finally {
    await server.end();
  }

  const test = new Client({ connectionString: getTestDatabaseUrl() });
  await test.connect();
  try {
    await test.query('SELECT 1');
  } finally {
    await test.end();
  }
}