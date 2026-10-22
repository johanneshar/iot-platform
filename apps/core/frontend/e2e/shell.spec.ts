import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Läuft gegen Core-Backend (frische Datenbank, Beispielbenutzer je Rolle), Beispielmodul und Shell –
// siehe playwright.config.ts
test.describe.configure({ mode: 'serial' });

const PASSWORD = 'e2e-passwort';

// Das Beispielmodul meldet sich nach dem Start beim Core an (bei Bedarf mit Wiederholung)
test.beforeAll(async ({ request }) => {
  await request.post('/api/auth/login', { data: { username: 'service', password: PASSWORD } });
  await expect
    .poll(
      async () => {
        const state = (await (await request.get('/api/shell')).json()) as {
          modules?: { id: string; installed: boolean }[];
        };
        return state.modules?.some((m) => m.id === 'example' && m.installed) ?? false;
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

async function signIn(page: Page, username: string, path = '/') {
  await page.goto(path);
  await page.getByLabel('Benutzer').fill(username);
  await page.getByLabel('Passwort').fill(PASSWORD);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(nav(page)).toBeVisible();
}

test('ohne Anmeldung erscheint die Anmeldung; falsche Daten werden abgelehnt', async ({ page }) => {
  await page.goto('/example');
  await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByLabel('Benutzer').fill('maintenance');
  await page.getByLabel('Passwort').fill('falsch');
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(page.getByRole('alert')).toHaveText('Benutzer oder Passwort ist falsch.');
});

test('Navigation entsteht nur aus angemeldeten Manifesten', async ({ page }) => {
  await signIn(page, 'admin');
  await expect(nav(page).getByRole('button', { name: 'Beispielmodul' })).toBeVisible();
  await expect(nav(page).getByRole('button', { name: /Baukasten/ })).toBeVisible();
  // gebucht, aber nicht installiert → nicht in der Navigation
  await expect(nav(page).getByRole('button', { name: 'Alarm-Analytics' })).toHaveCount(0);
});

test('Modulseite wird aus dem Einstiegsmodul geladen; Benutzer steht im Kopf', async ({ page }) => {
  await signIn(page, 'operator', '/example');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Beispielmodul');
  await expect(page.getByText('Dieses Modul wurde mit pnpm create-module angelegt.')).toBeVisible();
  await expect(page.getByText('[Operator]')).toBeVisible();
  await expectNoA11yViolations(page);
});

test('Admin: Abschalten sperrt die Navigation, Aktivieren gibt sie frei – mit Audit-Eintrag', async ({
  page,
}) => {
  await signIn(page, 'admin', '/baukasten');
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

  await nav(page).getByRole('button', { name: 'Audit Trail' }).click();
  await expect(page.getByRole('cell', { name: 'Modul abbestellt' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Modul gebucht' })).toBeVisible();
});

test('Operator: darf nicht buchen und sieht keinen Audit Trail', async ({ page }) => {
  await signIn(page, 'operator', '/baukasten');
  const card = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Condition Monitoring' }) });
  await expect(card.getByRole('button', { name: 'Modul buchen' })).toBeDisabled();
  await expect(nav(page).getByRole('button', { name: 'Audit Trail' })).toHaveCount(0);
});

test('Kernmodule sind immer enthalten', async ({ page }) => {
  await signIn(page, 'admin', '/baukasten');
  const card = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Datenkern' }) });
  await expect(card.getByText('Immer enthalten')).toBeVisible();
  await expect(card.getByRole('button')).toHaveCount(0);
});

test('e-Signatur aus einem Modul landet mit Bedeutung im Audit Trail', async ({ page }) => {
  await signIn(page, 'service', '/example');
  await page.getByRole('button', { name: 'Beispiel signieren' }).click();
  const dialog = page.getByRole('dialog', { name: 'Elektronische Signatur' });
  await expect(dialog.getByText('Freigabe')).toBeVisible();
  await expectNoA11yViolations(page);

  await dialog.getByLabel('Benutzer').fill('service');
  await dialog.getByLabel('Passwort').fill('falsch');
  await dialog.getByRole('button', { name: 'Signieren' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Benutzer oder Passwort ist falsch');

  await dialog.getByLabel('Passwort').fill(PASSWORD);
  await dialog.getByRole('button', { name: 'Signieren' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('von [Service] · im Audit Trail erfasst')).toBeVisible();

  await nav(page).getByRole('button', { name: 'Audit Trail' }).click();
  const row = page.getByRole('row').filter({ hasText: 'example.demo-signed' });
  await expect(row.getByRole('cell', { name: 'Signatur: Freigabe' })).toBeVisible();
  await expect(page.getByText(/Kette unversehrt/)).toBeVisible();
  await expectNoA11yViolations(page);
});

test('Sprache umschalten übersetzt Shell und Modul', async ({ page }) => {
  await signIn(page, 'operator', '/example');
  await page.getByLabel('Sprache').selectOption('en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Example module');
  await expect(page.getByText('This module was created with pnpm create-module.')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByLabel('Language').selectOption('de');
});

test('Linienwahl bietet die Linien des Standorts an', async ({ page }) => {
  await signIn(page, 'operator', '/example');
  const select = page.getByLabel('Linie wählen');
  await expect(select).toHaveValue('l1');
  await expect(select.locator('option')).toHaveText(['Linie 1 · Vials', 'Linie 2 · Spritzen']);
});

test('Abmelden führt zur Anmeldung zurück', async ({ page }) => {
  await signIn(page, 'operator');
  await page.getByRole('button', { name: 'Abmelden' }).click();
  await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible();
});
