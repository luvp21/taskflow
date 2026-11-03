import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Imported from vitest/config so the same file can also hold the `test` options.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
