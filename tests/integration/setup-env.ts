import 'dotenv/config';
import { getTestDatabaseUrl } from '../../scripts/lib/test-env';

process.env.DATABASE_URL = getTestDatabaseUrl();