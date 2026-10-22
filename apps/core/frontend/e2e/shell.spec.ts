import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Läuft gegen Core-Backend (frische Datenbank), Beispielmodul und Shell – siehe playwright.config.ts
test.describe.configure({ mode: 'serial' });

// Das Beispielmodul meldet sich nach dem Start beim Core an (bei Bedarf mit Wiederholung)
test.beforeAll(async ({ request }) => {
  await expect
    .poll(
      async () => {
        const state = (await (await request.get('/api/shell')).json()) as {
          modules: { id: string; installed: boolean }[];
        };
        return state.modules.some((m) => m.id === 'example' && m.installed);
      },
      { timeout: 20_000 },
    )
    .toBe(true);
});

const nav = (page: Page) => page.getByRole('navigation', { name: 'Hauptnavigation' });

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
}

test('Navigation entsteht nur aus angemeldeten Manifesten', async ({ page }) => {
  await page.goto('/');
  await expect(nav(page).getByRole('button', { name: 'Beispielmodul' })).toBeVisible();
  await expect(nav(page).getByRole('button', { name: /Baukasten/ })).toBeVisible();
  // gebucht, aber nicht installiert → nicht in der Navigation
  await expect(nav(page).getByRole('button', { name: 'Alarm-Analytics' })).toHaveCount(0);
});

test('Modulseite wird aus dem Einstiegsmodul geladen', async ({ page }) => {
  await page.goto('/example');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Beispielmodul');
  await expect(page.getByText('Dieses Modul wurde mit pnpm create-module angelegt.')).toBeVisible();
  await expect(page.getByText('Linie 1 · Vials').first()).toBeVisible();
  await expectNoA11yViolations(page);
});

test('Abschalten im Baukasten sperrt die Navigation, Aktivieren gibt sie frei', async ({
  page,
}) => {
  await page.goto('/baukasten');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Baukasten');
  await expectNoA11yViolations(page);

  const card = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Beispielmodul' }) });
  await card.getByRole('button', { name: 'Aktiv – deaktivieren' }).click();
  await expect(card.getByRole('button', { name: 'Modul buchen' })).toBeVisible();

  const item = nav(page).getByRole('button', { name: /Beispielmodul/ });
  await expect(item.getByRole('img', { name: 'nicht gebucht' })).toBeVisible();

  await item.click();
  await expect(
    page.getByRole('heading', { name: '„Beispielmodul“ ist für diese Linie nicht gebucht' }),
  ).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole('button', { name: 'Modul aktivieren' }).click();
  await expect(page.getByText('Dieses Modul wurde mit pnpm create-module angelegt.')).toBeVisible();
  await expect(item.getByRole('img', { name: 'nicht gebucht' })).toHaveCount(0);
});

test('Kernmodule sind immer enthalten', async ({ page }) => {
  await page.goto('/baukasten');
  const card = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Datenkern' }) });
  await expect(card.getByText('Immer enthalten')).toBeVisible();
  await expect(card.getByRole('button')).toHaveCount(0);
});

test('Sprache umschalten übersetzt Shell und Modul', async ({ page }) => {
  await page.goto('/example');
  await page.getByLabel('Sprache').selectOption('en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Example module');
  await expect(page.getByText('This module was created with pnpm create-module.')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByLabel('Language').selectOption('de');
});

test('Linienwahl bietet die Linien des Standorts an', async ({ page }) => {
  await page.goto('/example');
  const select = page.getByLabel('Linie wählen');
  await expect(select).toHaveValue('l1');
  await expect(select.locator('option')).toHaveText(['Linie 1 · Vials', 'Linie 2 · Spritzen']);
});
