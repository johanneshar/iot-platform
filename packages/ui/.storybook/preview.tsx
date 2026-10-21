import type { Decorator, Preview } from '@storybook/react-vite';
import i18next from 'i18next';
import { useEffect } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { UI_NAMESPACE, uiTranslations } from '../src/i18n/translations';
import '../src/styles/global.css';

const i18n = i18next.createInstance();
void i18n.use(initReactI18next).init({
  lng: 'de',
  fallbackLng: 'de',
  ns: [UI_NAMESPACE],
  resources: {
    de: { [UI_NAMESPACE]: uiTranslations.de },
    en: { [UI_NAMESPACE]: uiTranslations.en },
  },
  interpolation: { escapeValue: false },
});

function LocaleSync({ locale }: { locale: 'de' | 'en' }) {
  useEffect(() => {
    void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}

const withI18n: Decorator = (Story, context) => {
  const locale = context.globals['locale'] === 'en' ? 'en' : 'de';
  return (
    <I18nextProvider i18n={i18n}>
      <LocaleSync locale={locale} />
      <Story />
    </I18nextProvider>
  );
};

const preview: Preview = {
  decorators: [withI18n],
  globalTypes: {
    locale: {
      description: 'Sprache',
      toolbar: {
        title: 'Sprache',
        icon: 'globe',
        items: [
          { value: 'de', title: 'Deutsch' },
          { value: 'en', title: 'English' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: 'de' },
  parameters: {
    layout: 'padded',
    a11y: { test: 'error' },
    controls: { expanded: true },
  },
};

export default preview;
