import { SHARED_MODULES } from '@iot/module-sdk/manifest';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Gemeinsame Bibliotheken kommen zur Laufzeit von der Shell (Import-Map, ADR-002)
const external = Object.keys(SHARED_MODULES);

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'frontend/entry.tsx',
      formats: ['es'],
      fileName: () => 'entry.js',
      cssFileName: 'entry',
    },
    rollupOptions: { external },
    emptyOutDir: true,
  },
  test: { include: ['tests/**/*.test.{ts,tsx}'] },
});
