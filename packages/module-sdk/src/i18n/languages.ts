/**
 * Unterstützte Oberflächensprachen. Eine neue Sprache kommt hinzu, indem sie hier
 * eingetragen wird und jedes Paket eine passende `locales/<code>.json` mitbringt.
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'en', nativeName: 'English' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE: LanguageCode = 'de';

export function isSupportedLanguage(code: string): code is LanguageCode {
  return SUPPORTED_LANGUAGES.some((language) => language.code === code);
}

/** Wählt die erste unterstützte Sprache aus den Kandidaten, z. B. `de-AT` → `de`. */
export function resolveLanguage(candidates: readonly (string | null | undefined)[]): LanguageCode {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const base = candidate.toLowerCase().split('-')[0] ?? '';
    if (isSupportedLanguage(base)) return base;
  }
  return DEFAULT_LANGUAGE;
}
