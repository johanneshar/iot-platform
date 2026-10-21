import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const CORE_BACKEND_URL = process.env['CORE_BACKEND_URL'] ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: true,
    proxy: { '/api': CORE_BACKEND_URL },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
