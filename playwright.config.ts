import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const CI = Boolean(process.env['CI']);

// Eigene Ports für die Tests, damit ein laufendes `pnpm dev` nicht stört
const CORE_BACKEND = 'http://localhost:4010';
const SHELL_URL = 'http://localhost:5185';
const EXAMPLE_MODULE = 'http://localhost:4110';
const DASHBOARD_MODULE = 'http://localhost:4111';
const ALARMS_MODULE = 'http://localhost:4112';
const TROUBLESHOOTING_MODULE = 'http://localhost:4113';
const TEST_BROKER = 'mqtt://localhost:1885';
const STORYBOOK_URL = 'http://localhost:5183';
const E2E_DATA_DIR = fileURLToPath(new URL('./test-results/core-data', import.meta.url));
const E2E_MODULE_DATA = fileURLToPath(new URL('./test-results/module-data', import.meta.url));
// Frische Datenbank je Lauf
const fresh = (dir: string) =>
  `node -e "require('fs').rmSync(process.argv[1],{recursive:true,force:true})" "${dir}"`;

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
      // MQTT-Broker im Prozess mit Simulator – E2E ohne Docker
      command: 'node tooling/scripts/test-broker.mjs 1885 --with-simulator',
      port: 1885,
      reuseExistingServer: false,
    },
    {
      // Frische Datenbank je Lauf; Buchungsstand aus config/licenses.dev.json
      command: `${fresh(E2E_DATA_DIR)} && pnpm --filter @iot/core-backend start`,
      url: `${CORE_BACKEND}/api/health`,
      env: {
        CORE_PORT: '4010',
        CORE_DATA_DIR: E2E_DATA_DIR,
        CORE_DEV_PASSWORD: 'e2e-passwort',
        CORE_MQTT_URL: TEST_BROKER,
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
      command:
        'pnpm --filter @iot/module-dashboard build && pnpm --filter @iot/module-dashboard start',
      url: `${DASHBOARD_MODULE}/entry.js`,
      env: { MODULE_PORT: '4111', CORE_URL: CORE_BACKEND },
      reuseExistingServer: false,
    },
    {
      command: `${fresh(`${E2E_MODULE_DATA}/alarms`)} && pnpm --filter @iot/module-alarms build && pnpm --filter @iot/module-alarms start`,
      url: `${ALARMS_MODULE}/entry.js`,
      env: {
        MODULE_PORT: '4112',
        CORE_URL: CORE_BACKEND,
        MQTT_URL: TEST_BROKER,
        MODULE_DATA_DIR: `${E2E_MODULE_DATA}/alarms`,
      },
      reuseExistingServer: false,
    },
    {
      command: `${fresh(`${E2E_MODULE_DATA}/troubleshooting`)} && pnpm --filter @iot/module-troubleshooting build && pnpm --filter @iot/module-troubleshooting start`,
      url: `${TROUBLESHOOTING_MODULE}/entry.js`,
      env: {
        MODULE_PORT: '4113',
        CORE_URL: CORE_BACKEND,
        MODULE_DATA_DIR: `${E2E_MODULE_DATA}/troubleshooting`,
      },
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
