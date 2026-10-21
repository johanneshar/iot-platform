import i18next, { type i18n, type Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type LanguageCode } from './languages';

/** Übersetzungen eines Pakets: ein Namespace, je Sprache ein Schlüssel-Objekt. */
export interface Translations {
  namespace: string;
  resources: Partial<Record<LanguageCode, Record<string, unknown>>>;
}

export interface CreateI18nOptions {
  language: LanguageCode;
  translations: readonly Translations[];
}

/**
 * Erzeugt eine eigene i18next-Instanz für die Shell. Fehlt ein Schlüssel in einer
 * Sprache, wird Deutsch angezeigt – nie ein leerer Text.
 */
export async function createI18n({ language, translations }: CreateI18nOptions): Promise<i18n> {
  const resources: Resource = {};
  for (const { namespace, resources: byLanguage } of translations) {
    for (const [code, keys] of Object.entries(byLanguage)) {
      resources[code] = { ...resources[code], [namespace]: keys };
    }
  }

  const instance = i18next.createInstance();
  await instance.use(initReactI18next).init({
    lng: language,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    ns: translations.map((t) => t.namespace),
    resources,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return instance;
}
