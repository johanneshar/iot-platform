import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { sharedInputs, sharedModules } from './build/shared-modules-plugin';

const CORE_BACKEND_URL = process.env['CORE_BACKEND_URL'] ?? 'http://localhost:4000';
const PORT = Number(process.env['CORE_FRONTEND_PORT'] ?? 5180);

export default defineConfig({
  plugins: [react(), sharedModules()],
  server: {
    port: PORT,
    strictPort: true,
    proxy: { '/api': CORE_BACKEND_URL },
  },
  build: {
    rollupOptions: {
      input: { main: fileURLToPath(new URL('./index.html', import.meta.url)), ...sharedInputs },
      // Die Weiterleitungsmodule müssen ihre Exporte behalten
      preserveEntrySignatures: 'strict',
      output: {
        entryFileNames: (chunk) =>
          chunk.name.startsWith('shared/') ? '[name].js' : 'assets/[name]-[hash].js',
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
