import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// One config for the whole repo. Shared TS rules apply everywhere; React rules
// only to the client, Node globals only to the server.
export default defineConfig([
  globalIgnores(['**/dist', '**/coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      // A leading underscore marks a parameter that must exist but isn't used, e.g.
      // Express only treats a middleware as an error handler if it declares 4 args.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['client/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['server/**/*.ts', '*.config.{js,ts}', 'client/vite.config.ts'],
    languageOptions: { globals: globals.node },
  },
]);
