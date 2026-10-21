import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('leere Shell startet und schaltet die Sprache um', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('IoT-Plattform');

  await page.getByLabel('Sprache').selectOption('en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('IoT Platform');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('Shell ist ohne Barrierefreiheitsfehler', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
