import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Alarm → Deep Link → Fehlerbaum → Lösung (Abnahme M5); Daten aus dem Simulator (playwright.config.ts)
const PASSWORD = 'e2e-passwort';
const ALARM = 'Wägezelle 3: Tara-Abweichung';

test.beforeAll(async ({ request }) => {
  await request.post('/api/auth/login', { data: { username: 'service', password: PASSWORD } });
  // Beide Module angemeldet, Fehlerbäume veröffentlicht, Alarm im Datenkern
  await expect
    .poll(
      async () => {
        const shell = (await (await request.get('/api/shell')).json()) as {
          modules?: { id: string; installed: boolean; targets: Record<string, string[]> }[];
        };
        const data = (await (await request.get('/api/data')).json()) as {
          machines?: { alarms: { alarmId: string }[] }[];
        };
        const ts = shell.modules?.find((m) => m.id === 'troubleshooting');
        return (
          (shell.modules?.some((m) => m.id === 'alarms' && m.installed) ?? false) &&
          (ts?.targets['alarm']?.includes('FILL-WGT-0003') ?? false) &&
          (data.machines?.some((m) => m.alarms.some((a) => a.alarmId === 'FILL-WGT-0003')) ?? false)
        );
      },
      { timeout: 30_000 },
    )
    .toBe(true);
});

async function login(page: Page, path: string, username: string) {
  await page.goto(path);
  await page.getByLabel('Benutzer').fill(username);
  await page.getByLabel('Passwort').fill(PASSWORD);
  await page.getByRole('button', { name: 'Anmelden' }).click();
}

test('Alarmliste: Fehlersuche per Deep Link bis zur dokumentierten Lösung', async ({ page }) => {
  await login(page, '/alarms', 'maintenance');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Alarme');
  const table = page.getByRole('region', { name: 'Alarmliste' });
  const row = table.getByRole('row').filter({ hasText: ALARM });
  await expect(row).toBeVisible();
  // Kein Quittieren über die Plattform (E-32)
  await expect(page.getByRole('button', { name: /Quittieren/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Top-Störungen' })).toBeVisible();

  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);

  await row.getByRole('button', { name: `Fehlersuche: ${ALARM}` }).click();
  await expect(page).toHaveURL(/\/troubleshooting\?/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Geführte Fehlersuche');
  await expect(page.getByRole('heading', { name: ALARM })).toBeVisible();

  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Ja', exact: true }).click();
  await expect(page.getByText('Wägezelle tauschen', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ersatzteil ET-50100 anzeigen' })).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Bisherige Antworten' }).getByRole('listitem'),
  ).toHaveCount(3);

  const axeResult = await new AxeBuilder({ page }).analyze();
  expect(axeResult.violations).toEqual([]);

  await page.getByRole('button', { name: 'Lösung dokumentieren' }).click();
  await expect(page.getByText('Dokumentiert.')).toBeVisible();

  await page.getByRole('button', { name: '← Schritt zurück' }).click();
  await expect(page.getByRole('button', { name: 'Ja', exact: true })).toBeVisible();
});

test('Dashboard: „Fehlersuche starten“ öffnet den Fehlerbaum; Operator dokumentiert nicht', async ({
  page,
}) => {
  await login(page, '/dashboard', 'operator');
  await page.getByRole('button', { name: `Fehlersuche starten: ${ALARM}` }).click();
  await expect(page.getByRole('heading', { name: ALARM })).toBeVisible();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Ja', exact: true }).click();
  await expect(page.getByText('Wägezelle tauschen', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lösung dokumentieren' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Andere Störung wählen' }).click();
  await expect(page.getByRole('heading', { name: 'Zu aktivem Alarm' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nach Symptom' })).toBeVisible();
});
