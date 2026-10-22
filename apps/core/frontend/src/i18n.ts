import { createI18n, resolveLanguage, type LanguageCode } from '@iot/module-sdk';
import { UI_NAMESPACE, uiTranslations } from '@iot/ui';
import de from './locales/de.json';
import en from './locales/en.json';

export const CORE_NAMESPACE = 'core';

const STORAGE_KEY = 'iot.language';

function readStoredLanguage(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeLanguage(language: LanguageCode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Ohne Speicher gilt die Wahl nur bis zum Neuladen.
  }
}

export function initialLanguage(): LanguageCode {
  return resolveLanguage([readStoredLanguage(), ...navigator.languages]);
}

/** Übersetzungen der Shell und der Komponentenbibliothek; Module ergänzen ihre beim Laden. */
export function createCoreI18n(language: LanguageCode = initialLanguage()) {
  return createI18n({
    language,
    translations: [
      { namespace: CORE_NAMESPACE, resources: { de, en } },
      { namespace: UI_NAMESPACE, resources: uiTranslations },
    ],
  });
}
