import { I18nProvider } from '@iot/module-sdk';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createCoreI18n } from '../i18n';
import { App } from './App';

async function renderApp(language: 'de' | 'en' = 'de') {
  const i18n = await createCoreI18n(language);
  render(
    <I18nProvider i18n={i18n}>
      <App />
    </I18nProvider>,
  );
}

afterEach(cleanup);

describe('Shell', () => {
  it('zeigt den Titel auf Deutsch', async () => {
    await renderApp('de');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('IoT-Plattform');
    expect(screen.getByRole('navigation', { name: 'Hauptnavigation' })).toBeDefined();
  });

  it('schaltet die Sprache auf Englisch um', async () => {
    await renderApp('de');
    fireEvent.change(screen.getByLabelText('Sprache'), { target: { value: 'en' } });
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('IoT Platform');
    expect(document.documentElement.lang).toBe('en');
  });
});
