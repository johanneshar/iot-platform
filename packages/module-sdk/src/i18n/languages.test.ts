import { describe, expect, it } from 'vitest';
import { createI18n } from './create-i18n';
import { isSupportedLanguage, resolveLanguage } from './languages';

describe('resolveLanguage', () => {
  it('nimmt die erste unterstützte Sprache', () => {
    expect(resolveLanguage([null, 'fr', 'en-GB', 'de'])).toBe('en');
  });

  it('fällt ohne Treffer auf Deutsch zurück', () => {
    expect(resolveLanguage(['fr', undefined])).toBe('de');
  });
});

describe('isSupportedLanguage', () => {
  it('kennt de und en', () => {
    expect(isSupportedLanguage('de')).toBe(true);
    expect(isSupportedLanguage('en')).toBe(true);
    expect(isSupportedLanguage('fr')).toBe(false);
  });
});

describe('createI18n', () => {
  const translations = [
    {
      namespace: 'demo',
      resources: { de: { hello: 'Hallo', onlyDe: 'Nur deutsch' }, en: { hello: 'Hello' } },
    },
  ];

  it('übersetzt in der gewählten Sprache', async () => {
    const i18n = await createI18n({ language: 'en', translations });
    expect(i18n.t('demo:hello')).toBe('Hello');
  });

  it('zeigt bei fehlendem Schlüssel den deutschen Text', async () => {
    const i18n = await createI18n({ language: 'en', translations });
    expect(i18n.t('demo:onlyDe')).toBe('Nur deutsch');
  });

  it('wechselt die Sprache zur Laufzeit', async () => {
    const i18n = await createI18n({ language: 'de', translations });
    await i18n.changeLanguage('en');
    expect(i18n.t('demo:hello')).toBe('Hello');
  });
});
