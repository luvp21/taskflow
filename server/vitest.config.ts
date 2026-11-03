import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./tests/globalSetup.ts'],
    setupFiles: ['./tests/setup.ts'],
    // The first run downloads a mongod binary, which can take a while.
    hookTimeout: 120_000,
  },
});
