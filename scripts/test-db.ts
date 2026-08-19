import { execSync } from 'node:child_process';
import { Client } from 'pg';
import {
  getServerDatabaseUrl,
  getTestDatabaseName,
  getTestDatabaseUrl,
} from './lib/test-env';

async function createDatabaseIfMissing(): Promise<void> {
  const serverUrl = getServerDatabaseUrl();
  const client = new Client({ connectionString: serverUrl });
  await client.connect();
  try {
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [getTestDatabaseName()]
    );
    if (result.rowCount === 0) {
      await client.query(`CREATE DATABASE ${getTestDatabaseName()}`);
      console.log(`Created database ${getTestDatabaseName()}.`);
    } else {
      console.log(`Database ${getTestDatabaseName()} already exists.`);
    }
  } finally {
    await client.end();
  }
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv): void {
  execSync([command, ...args].join(' '), { stdio: 'inherit', env });
}

async function main(): Promise<void> {
  const testUrl = getTestDatabaseUrl();
  await createDatabaseIfMissing();

  const wipe = new Client({ connectionString: testUrl });
  await wipe.connect();
  try {
    await wipe.query('DROP SCHEMA IF EXISTS public CASCADE');
    await wipe.query('CREATE SCHEMA public');
  } finally {
    await wipe.end();
  }

  run('npx', ['prisma', 'migrate', 'deploy'], {
    ...process.env,
    DATABASE_URL: testUrl,
  });
  run('npx', ['tsx', 'prisma/seed.ts'], {
    ...process.env,
    DATABASE_URL: testUrl,
  });
  console.log('Test database is ready:', testUrl);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});