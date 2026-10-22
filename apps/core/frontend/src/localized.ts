import type { LocalizedText } from '@iot/module-sdk';

/** Text in der aktuellen Sprache, sonst Deutsch. */
export function localized(text: LocalizedText, language: string): string {
  return (text as Record<string, string | undefined>)[language] ?? text.de;
}
