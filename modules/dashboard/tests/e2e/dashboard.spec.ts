import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Simulator → Test-Broker → Datenkern im Core → Linien-Dashboard (playwright.config.ts)
const PASSWORD = 'e2e-passwort';

test.beforeAll(async ({ request }) => {
  await request.post('/api/auth/login', { data: { username: 'service', password: PASSWORD } });
  // Dashboard angemeldet und Daten der sechs Maschinen der Flexfill im Datenkern
  await expect
    .poll(
      async () => {
        const shell = (await (await request.get('/api/shell')).json()) as {
          modules?: { id: string; installed: boolean }[];
        };
        const data = (await (await request.get('/api/data')).json()) as {
          machines?: { identity: unknown }[];
        };
        return (
          (shell.modules?.some((m) => m.id === 'dashboard' && m.installed) ?? false) &&
          (data.machines?.filter((m) => m.identity).length ?? 0) === 6
        );
      },
      { timeout: 30_000 },
    )
    .toBe(true);
});

const flow = (page: Page) =>
  page.locator('section').filter({ has: page.getByRole('heading', { name: 'Linienfluss' }) });

async function openDashboard(page: Page) {
  await page.goto('/dashboard');
  await page.getByLabel('Benutzer').fill('operator');
  await page.getByLabel('Passwort').fill(PASSWORD);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Linienübersicht');
}

test('Linienübersicht zeigt die Linie aus dem Simulator wie im Mockup', async ({ page }) => {
  await openDashboard(page);

  for (const label of ['Linien-OEE', 'Verfügbarkeit', 'Leistung', 'Qualität', 'Ausbringung']) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByText('Schicht seit', { exact: false })).toBeVisible();
  await expect(page.getByText('kein Ziel hinterlegt')).toBeVisible();

  const lineFlow = flow(page);
  for (const name of [
    'Isolator',
    'Beutelauspacker',
    'Öffner',
    'Füll- und Verschließmaschine',
    'Transfermodul',
    'Bördelmodul',
  ]) {
    await expect(lineFlow.getByRole('button', { name: new RegExp(name) })).toBeVisible();
  }
  await expect(lineFlow.getByText('Fremd · Basis')).toBeVisible();
  await expect(lineFlow.getByText('Suspended')).toBeVisible();

  // Navigation wie im Mockup: „Linienübersicht“ statt des Produktnamens
  await expect(
    page
      .getByRole('navigation', { name: 'Hauptnavigation' })
      .getByRole('button', { name: 'Linienübersicht' }),
  ).toBeVisible();

  // Zustand der Linie im Kopf der Shell
  await expect(page.getByText('Linie: Execute')).toBeVisible();

  const alarms = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Anstehende Alarme' }) });
  await expect(alarms.getByText(/\d+ aktiv/)).toBeVisible();
  await expect(alarms.getByText('Wägezelle 3: Tara-Abweichung')).toBeVisible();

  await new AxeBuilder({ page }).analyze().then((r) => {
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });
});

test('Kennzahlen entstehen aus den laufenden Zählern; genau eine Maschine ist Engpass', async ({
  page,
}) => {
  await openDashboard(page);
  const oee = page
    .locator('div')
    .filter({ has: page.getByText('Linien-OEE', { exact: true }) })
    .last();
  await expect
    .poll(async () => (await oee.innerText()).includes('—'), { timeout: 30_000 })
    .toBe(false);
  await expect
    .poll(async () => flow(page).getByText('Engpass', { exact: true }).count(), { timeout: 30_000 })
    .toBe(1);
});

test('Maschine antippen öffnet die Detailseite mit Auswertungen (E-38)', async ({ page }) => {
  await openDashboard(page);
  await flow(page)
    .getByRole('button', { name: /Füll- und Verschließmaschine/ })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/machine\?id=l3-fill/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Füll- und Verschließmaschine');
  await expect(page.getByText('S7-1500 · IIoT-Datenbaustein (OPC UA) · Voll (GxP)')).toBeVisible();
  for (const heading of ['Zustandsverlauf', 'Leistung', 'Ausschuss', 'Prozesswerte']) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await expect(page.getByText('OEE Maschine')).toBeVisible();
  await expect(page.getByText('Füllgewicht Ø')).toBeVisible();
  await expect(page.getByText('GxP').first()).toBeVisible();

  // Zeiträume aus der Konfiguration (E-37)
  const periods = page.getByRole('group', { name: 'Zeitraum' });
  await periods.getByRole('button', { name: '24 Stunden' }).click();
  await expect(periods.getByRole('button', { name: '24 Stunden' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('heading', { name: 'Zustandsverlauf' })).toBeVisible();
  await new AxeBuilder({ page }).analyze().then((r) => {
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  await page.getByRole('link', { name: 'Linienübersicht' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Linienübersicht');
});

test('Fremdmaschine der Stufe Basis: Detailseite ohne Prozesswerte (E-39)', async ({ page }) => {
  await openDashboard(page);
  await flow(page)
    .getByRole('button', { name: /Isolator/ })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Isolator');
  await expect(page.getByText('Fremd · Basis')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Zustandsverlauf' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Prozesswerte' })).toHaveCount(0);
  await expect(page.getByText(/Stufe Basis: Zustand, Zähler und Sammelstörung/)).toBeVisible();
  await expect(page.getByText(/Fremdmaschine: Ersatzteile und Service/)).toBeVisible();
});

test('Deep Link aus der Detailseite führt über die Shell zum Zielmodul', async ({ page }) => {
  await openDashboard(page);
  await flow(page)
    .getByRole('button', { name: /Füll- und Verschließmaschine/ })
    .click();
  await page.getByRole('button', { name: 'Ersatzteile dieser Maschine' }).click();
  await expect(page).toHaveURL(/\/spares\?machine=l3-fill/);
  // Ersatzteilkatalog ist gebucht, aber noch nicht installiert
  await expect(
    page.getByText('„Ersatzteilkatalog“ ist auf dem Edge Device dieser Linie nicht installiert.'),
  ).toBeVisible();
});

test('3D-Ansicht: Markierung führt in die Fehlersuche, Maschine antippen in die Detailseite (A-01)', async ({
  page,
}) => {
  await openDashboard(page);
  const view = page.getByRole('region', { name: '3D-Ansicht der Linie' });
  await expect(view).toHaveAttribute('data-model-state', 'ready', { timeout: 30_000 });
  await expect(view.getByRole('button', { name: 'Beutelauspacker' })).toBeVisible();
  await new AxeBuilder({ page }).analyze().then((r) => {
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  // nur Alarme mit Fehlerbaum sind markiert (A-01.9)
  await expect(view.getByRole('button', { name: /Fehlersuche starten$/ })).toHaveCount(1);
  await view
    .getByRole('button', { name: 'Störung Wägezelle 3: Tara-Abweichung – Fehlersuche starten' })
    .click();
  await expect(page).toHaveURL(/\/troubleshooting\?alarmId=FILL-WGT-0003/);
  await expect(page.getByRole('heading', { name: 'Wägezelle 3: Tara-Abweichung' })).toBeVisible();

  await page.goto('/dashboard');
  await expect(view).toHaveAttribute('data-model-state', 'ready', { timeout: 30_000 });
  await view.getByRole('button', { name: 'Füll- und Verschließmaschine' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Füll- und Verschließmaschine');
  const machineView = page.getByRole('region', { name: '3D-Ansicht Füll- und Verschließmaschine' });
  await expect(machineView).toHaveAttribute('data-model-state', 'ready', { timeout: 30_000 });
  await expect(machineView.getByRole('button', { name: /Wägezelle 3/ })).toBeVisible();
});
