import { render } from '@testing-library/react';
import i18next from 'i18next';
import type { ReactElement } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { UI_NAMESPACE, uiTranslations } from '../i18n/translations';

/** Rendert mit eigener i18n-Instanz, wahlweise auf Deutsch oder Englisch. */
export async function renderUi(ui: ReactElement, language: 'de' | 'en' = 'de') {
  const i18n = i18next.createInstance();
  await i18n.use(initReactI18next).init({
    lng: language,
    fallbackLng: 'de',
    ns: [UI_NAMESPACE],
    resources: {
      de: { [UI_NAMESPACE]: uiTranslations.de },
      en: { [UI_NAMESPACE]: uiTranslations.en },
    },
    interpolation: { escapeValue: false },
  });
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}
