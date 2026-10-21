import { useTranslation } from 'react-i18next';
import de from './de.json';
import en from './en.json';

/** Namespace der festen Texte in @iot/ui. Die Shell registriert ihn zusammen mit ihren eigenen. */
export const UI_NAMESPACE = 'ui';

export const uiTranslations = { de, en } as const;

/** Übersetzungsfunktion für Komponenten der Bibliothek. */
export function useUiTranslation() {
  return useTranslation(UI_NAMESPACE).t;
}
