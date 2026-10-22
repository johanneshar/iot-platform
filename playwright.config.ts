import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const CI = Boolean(process.env['CI']);

// Eigene Ports für die Tests, damit ein laufendes `pnpm dev` nicht stört
const CORE_BACKEND = 'http://localhost:4010';
const SHELL_URL = 'http://localhost:5185';
const EXAMPLE_MODULE = 'http://localhost:4110';
const STORYBOOK_URL = 'http://localhost:5183';
const E2E_DATA_DIR = fileURLToPath(new URL('./test-results/core-data', import.meta.url));

export default defineConfig({
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  // Referenzbilder ohne Plattform-Suffix: sie werden ausschließlich unter Linux (CI) erzeugt
  snapshotPathTemplate: '{testFileDir}/__screenshots__/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixels: 0 } },
  use: {
    locale: 'de-DE',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'shell',
      testMatch: ['apps/*/*/e2e/**/*.spec.ts', 'modules/*/tests/e2e/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'], baseURL: SHELL_URL },
    },
    {
      // Läuft gegen das gebaute Storybook: vorher `pnpm storybook:build`
      name: 'ui',
      testMatch: ['packages/ui/e2e/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'], baseURL: STORYBOOK_URL },
    },
  ],
  webServer: [
    {
      // Frische Datenbank je Lauf; Buchungsstand aus config/licenses.dev.json
      command: `node -e "require('fs').rmSync(process.argv[1],{recursive:true,force:true})" "${E2E_DATA_DIR}" && pnpm --filter @iot/core-backend start`,
      url: `${CORE_BACKEND}/api/health`,
      env: {
        CORE_PORT: '4010',
        CORE_DATA_DIR: E2E_DATA_DIR,
        CORE_DEV_PASSWORD: 'e2e-passwort',
        NODE_ENV: 'test',
      },
      reuseExistingServer: false,
    },
    {
      command: 'pnpm --filter @iot/module-example build && pnpm --filter @iot/module-example start',
      url: `${EXAMPLE_MODULE}/entry.js`,
      env: { MODULE_PORT: '4110', CORE_URL: CORE_BACKEND },
      reuseExistingServer: false,
    },
    {
      command: 'pnpm --filter @iot/core-frontend dev',
      url: SHELL_URL,
      env: { CORE_FRONTEND_PORT: '5185', CORE_BACKEND_URL: CORE_BACKEND },
      reuseExistingServer: false,
    },
    {
      command: 'node tooling/scripts/serve-static.mjs packages/ui/storybook-static 5183',
      url: STORYBOOK_URL,
      reuseExistingServer: !CI,
    },
  ],
});
