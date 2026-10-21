import { defineConfig, devices } from '@playwright/test';

const CI = Boolean(process.env['CI']);

export default defineConfig({
  testMatch: ['apps/*/*/e2e/**/*.spec.ts', 'modules/*/tests/e2e/**/*.spec.ts'],
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5180',
    locale: 'de-DE',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm --filter @iot/core-frontend dev',
    url: 'http://localhost:5180',
    reuseExistingServer: !CI,
  },
});
