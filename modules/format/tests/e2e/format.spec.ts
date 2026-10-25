import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import mqtt from 'mqtt';
import type { Change, FormatState } from '../../shared/format';

// Läuft im Projekt „shell-line-stop“ nach allen anderen Shell-Tests: stoppt die simulierte Linie
const PASSWORD = 'e2e-passwort';
const TEST_BROKER = 'mqtt://localhost:1885';

/** Bedienung am HMI nachspielen (pnpm sim …, E-51) */
async function sim(command: object) {
  const client = await mqtt.connectAsync(TEST_BROKER, {
    clientId: `e2e-sim-${String(Date.now())}`,
  });
  await client.publishAsync('sim/v1/l3/control', JSON.stringify(command), { qos: 1 });
  await client.endAsync();
}

async function login(page: Page, username: string) {
  await page.goto('/format');
  await page.getByLabel('Benutzer').fill(username);
  await page.getByLabel('Passwort').fill(PASSWORD);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Geführter Formatwechsel');
}

async function logout(page: Page) {
  await page.getByRole('button', { name: 'Abmelden' }).click();
  await expect(page.getByRole('button', { name: 'Anmelden' })).toBeVisible();
}

async function signDialog(page: Page, username: string, meaning: string) {
  const dialog = page.getByRole('dialog', { name: 'Elektronische Signatur' });
  await expect(dialog.getByText(meaning, { exact: true })).toBeVisible();
  await dialog.getByLabel('Benutzer').fill(username);
  await dialog.getByLabel('Passwort').fill(PASSWORD);
  await dialog.getByRole('button', { name: 'Signieren' }).click();
  await expect(dialog).toBeHidden();
}

const state = async (request: APIRequestContext) =>
  (await (await request.get('/api/modules/format/state')).json()) as FormatState;

const expectNoA11yViolations = async (page: Page) => {
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
};

test.afterAll(async () => {
  // Linie wieder anlaufen lassen, auch wenn der Test abbricht
  await sim({ command: 'start' });
});

test('Formatwechsel Vial → Spritze: Leerfahren, Scans, Vier-Augen-Freigabe, Rezeptprüfung (M7)', async ({
  page,
  request,
}) => {
  test.setTimeout(240_000);
  await request.post('/api/auth/login', { data: { username: 'service', password: PASSWORD } });
  // aktuelles Format aus dem Rezept des laufenden Batches (retained)
  await expect
    .poll(async () => (await state(request)).current?.format.de, { timeout: 30_000 })
    .toBe('Vial im Nest');
  // offener Wechsel aus einem früheren Versuch (Wiederholung in CI): abbrechen
  const open = (await state(request)).change;
  if (open) {
    const receipt = (await (
      await request.post('/api/audit', {
        data: {
          module: 'format',
          action: 'format.change-cancelled',
          newValue: open.id,
          reference: `format:${open.id}`,
        },
      })
    ).json()) as { seq: number };
    await request.post(`/api/modules/format/changes/${open.id}/cancel`, {
      data: { seq: receipt.seq },
    });
  }

  await login(page, 'setup');
  await expect(page.getByRole('heading', { name: 'Vial im Nest' })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: /Spritze im Nest/ }).click();
  await expect(page.getByText(/^0 von 28 Schritten$/)).toBeVisible();

  // Schritt 1: erst bestätigen, wenn alle Maschinen stehen
  const confirm = page.getByRole('button', { name: 'Schritt bestätigen' });
  await expect(page.getByText(/^Noch nicht gestoppt:/)).toBeVisible();
  await expect(confirm).toBeDisabled();
  await sim({ command: 'stop' });
  await expect(page.getByText('Alle Maschinen melden „Stopped“.')).toBeVisible({ timeout: 15_000 });
  await expectNoA11yViolations(page);
  await confirm.click();
  await expect(page.getByText(/^1 von 28 Schritten$/)).toBeVisible();

  // „Zurück“ nimmt den Schritt zurück
  await page.getByRole('button', { name: 'Zurück' }).click();
  await expect(page.getByText(/^0 von 28 Schritten$/)).toBeVisible();
  await confirm.click();

  const change = (await state(request)).change as Change;
  for (const [index, step] of change.procedure.steps.entries()) {
    if (index === 0) continue;
    await expect(page.getByText(`Schritt ${String(index + 1)} von 28`)).toBeVisible();
    if (step.part) {
      const partInput = page.getByLabel('Code am Formatteil');
      const slotInput = page.getByLabel(`Code am Einbauplatz (${step.part.slot})`);
      if (index === 4) {
        // falscher Code: Bestätigung bleibt gesperrt
        await partInput.fill('FT-2041');
        await partInput.press('Enter');
        await expect(
          page.getByText(`FT-2041 passt nicht – erwartet ${step.part.id}`),
        ).toBeVisible();
        await expect(confirm).toBeDisabled();
        await expectNoA11yViolations(page);
      }
      await partInput.fill(step.part.id);
      await partInput.press('Enter');
      await slotInput.fill(step.part.slot);
      await slotInput.press('Enter');
      await expect(page.getByText('✓ Code geprüft · passt zu Spritze im Nest')).toBeVisible();
    }
    await confirm.click();
  }
  await expect(page.getByRole('heading', { name: 'Alle Schritte erledigt' })).toBeVisible();

  // Erste Signatur „Durchgeführt“ durch Setup Man
  await page.getByRole('button', { name: 'Formatwechsel abschließen (e-Signatur)' }).click();
  await signDialog(page, 'setup', 'Durchgeführt');
  await expect(page.getByText(/^Vier-Augen-Prinzip:/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Formatwechsel freigeben (e-Signatur)' }),
  ).toHaveCount(0);
  await logout(page);

  // Zweite Signatur „Freigabe“ durch QA
  await login(page, 'qa');
  await page.getByRole('button', { name: 'Formatwechsel freigeben (e-Signatur)' }).click();
  await signDialog(page, 'qa', 'Freigabe');
  await expect(page.getByText('Formatwechsel abgeschlossen.')).toBeVisible();
  await expect(page.getByText(/Linie bereit für Spritze im Nest/)).toBeVisible();
  await expect(page.getByText(/^Rezeptprüfung beim nächsten Batchstart/)).toBeVisible();
  await expectNoA11yViolations(page);

  // Bediener lädt das Rezept am HMI und startet die Linie → Prüfung beim Batchstart
  await sim({ command: 'recipe', recipe: 'syringe-nest' });
  await sim({ command: 'start' });
  await expect(
    page.getByText(/^✓ Batch B-\d{4}-\d{4}: Alle Maschinen melden „syringe-nest“\.$/),
  ).toBeVisible({
    timeout: 20_000,
  });

  // Audit Trail des Core enthält beide Signaturen
  const audit = (await (await request.get('/api/audit')).json()) as {
    action: string;
    meaning: string | null;
  }[];
  expect(audit.filter((e) => e.action.startsWith('format.')).map((e) => e.meaning)).toEqual(
    expect.arrayContaining(['Durchgeführt', 'Freigabe']),
  );
});
