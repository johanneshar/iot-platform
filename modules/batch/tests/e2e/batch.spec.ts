import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Batch-Zyklus im Test: 20 s Lauf, 5 s Pause (playwright.config.ts) – Ablauf bis zur Freigabe (M6)
const PASSWORD = 'e2e-passwort';

interface Batch {
  batchId: string;
  status: string;
}

async function login(page: Page, username: string) {
  await page.goto('/batch');
  await page.getByLabel('Benutzer').fill(username);
  await page.getByLabel('Passwort').fill(PASSWORD);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Batch-Reporting');
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

test('Batch bis zur Freigabe: Räumung, Geprüft, Freigabe im Vier-Augen-Prinzip, PDF/A (M6)', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  await request.post('/api/auth/login', { data: { username: 'service', password: PASSWORD } });
  // ein Batch, den das Modul von Anfang an aufgezeichnet hat und der beendet ist
  let batchId = '';
  await expect
    .poll(
      async () => {
        const response = await request.get('/api/modules/batch/batches');
        if (!response.ok()) return false;
        const ended = ((await response.json()) as Batch[]).find((b) => b.status === 'ended');
        batchId = ended?.batchId ?? '';
        return Boolean(ended);
      },
      { timeout: 120_000, intervals: [2_000] },
    )
    .toBe(true);

  // Linienräumung durch den Operator
  await login(page, 'operator');
  const row = page.getByRole('row').filter({ hasText: batchId });
  if (await row.getByRole('button', { name: `Batch ${batchId} öffnen` }).count())
    await row.getByRole('button', { name: `Batch ${batchId} öffnen` }).click();
  await expect(page.getByRole('heading', { name: batchId, level: 2 })).toBeVisible();
  await page.getByRole('button', { name: 'Linienräumung bestätigen' }).click();
  await expect(page.getByText('Bericht-Hash (wird signiert)')).toBeVisible();
  await expect(page.getByRole('button', { name: /Bericht prüfen/ })).toHaveCount(0);
  await logout(page);

  // Prüfung durch den Einrichter
  await login(page, 'setup');
  await page
    .getByRole('row')
    .filter({ hasText: batchId })
    .getByRole('button', { name: /öffnen/ })
    .click();
  await page.getByRole('button', { name: 'Bericht prüfen (e-Signatur „Geprüft“)' }).click();
  await signDialog(page, 'setup', 'Geprüft');
  await expect(page.getByText(/von \[Setup Man\] · Bedeutung: Geprüft/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Elektronisch signieren (Freigabe)' })).toHaveCount(
    0,
  );
  await logout(page);

  // Freigabe durch QA, dann PDF/A
  await login(page, 'qa');
  await page
    .getByRole('row')
    .filter({ hasText: batchId })
    .getByRole('button', { name: /öffnen/ })
    .click();
  await page.getByRole('button', { name: 'Elektronisch signieren (Freigabe)' }).click();
  await signDialog(page, 'qa', 'Freigabe');
  await expect(page.getByText(/von \[QA\] · Bedeutung: Freigabe/)).toBeVisible();
  await expect(page.getByRole('heading', { name: batchId, level: 2 })).toBeVisible();
  const audit = page.getByRole('region', { name: 'Audit Trail' });
  for (const action of [
    'Linienräumung bestätigt',
    'Bericht geprüft (e-Signatur)',
    'Bericht freigegeben (e-Signatur)',
  ]) {
    await expect(audit.getByText(action)).toBeVisible();
  }
  await new AxeBuilder({ page }).analyze().then((r) => {
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Bericht als PDF exportieren' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`Batchbericht-${batchId}.pdf`);
  const path = await file.path();
  const { readFileSync } = await import('node:fs');
  const pdf = readFileSync(path).toString('latin1');
  expect(pdf.startsWith('%PDF-1.7')).toBe(true);
  expect(pdf).toContain('<pdfaid:part>2</pdfaid:part>');
  await expect(audit.getByText('Bericht als PDF/A exportiert')).toBeVisible();
});
