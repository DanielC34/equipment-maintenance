import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['./tests/integration/setup-env.ts'],
    globalSetup: ['./tests/integration/global-setup.ts'],
    hookTimeout: 120000,
    testTimeout: 60000,
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});