import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const PASSWORD = 'e2e-passwort';

async function login(page: Page, username: string, path: string) {
  await page.goto(path);
  await page.getByLabel('Benutzer').fill(username);
  await page.getByLabel('Passwort').fill(PASSWORD);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ersatzteilkatalog');
}

const nav = (page: Page) => page.getByRole('navigation', { name: 'Hauptnavigation' });

test('Ersatzteil suchen, in die Anfrageliste legen und an den Service senden (M7)', async ({
  page,
}) => {
  await login(page, 'maintenance', '/spares');
  await expect(page.getByText('20 Teile · alle Maschinen der Linie')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  // Baugruppe filtern, dann suchen
  await page
    .getByRole('group', { name: 'Baugruppe filtern' })
    .getByRole('button', { name: 'Wägung' })
    .click();
  await expect(page.getByText('2 Teile · alle Maschinen der Linie')).toBeVisible();
  await page
    .getByRole('group', { name: 'Baugruppe filtern' })
    .getByRole('button', { name: 'Alle' })
    .click();
  await page.getByLabel('Suche').fill('ET-20418');
  const part = page.getByRole('article', { name: 'Magnetkupplung Verschließkopf' });
  await expect(part.getByText('Nicht vorrätig')).toBeVisible();
  await expect(part.getByText('Lieferzeit 10 Tage')).toBeVisible();

  await part.getByRole('button', { name: 'Zur Anfrage hinzufügen' }).click();
  await expect(part.getByRole('button', { name: '✓ In der Anfrageliste' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  // Zähler in der Navigation (Mockup)
  await expect(nav(page).getByRole('button', { name: /Ersatzteilkatalog/ })).toContainText('1', {
    timeout: 15_000,
  });

  await page.getByRole('button', { name: 'Anfrage an Service senden' }).click();
  await expect(page.getByText('Anfrage übermittelt.')).toBeVisible();
  await expect(page.getByText(/Vorgang ANF-\d{4}-\d{4}/)).toBeVisible();
  await expect(page.getByText('Noch keine Teile ausgewählt.')).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('Operator sieht den Katalog, sendet aber keine Anfragen', async ({ page }) => {
  await login(page, 'operator', '/spares?search=FT-3320');
  const part = page.getByRole('article', { name: 'Nestaufnahme Spritzen-Nest' });
  await expect(part).toBeVisible();
  await expect(part.getByRole('button')).toHaveCount(0);
});

test('Fremdmaschine: Ersatzteile über den Hersteller', async ({ page }) => {
  await login(page, 'maintenance', '/spares?machine=l3-iso');
  await expect(
    page.getByText('Fremdmaschine: Ersatzteile und Service über den jeweiligen Hersteller.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Alle Teile anzeigen' }).click();
  await expect(page.getByText('20 Teile · alle Maschinen der Linie')).toBeVisible();
});
