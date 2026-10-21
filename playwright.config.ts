import { defineConfig, devices } from '@playwright/test';

const CI = Boolean(process.env['CI']);
const SHELL_URL = 'http://localhost:5180';
const STORYBOOK_URL = 'http://localhost:5183';

export default defineConfig({
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : 'list',
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
      command: 'pnpm --filter @iot/core-frontend dev',
      url: SHELL_URL,
      reuseExistingServer: !CI,
    },
    {
      command: 'node tooling/scripts/serve-static.mjs packages/ui/storybook-static 5183',
      url: STORYBOOK_URL,
      reuseExistingServer: !CI,
    },
  ],
});
