export { createI18n, type CreateI18nOptions, type Translations } from './i18n/create-i18n';
export {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  resolveLanguage,
  type LanguageCode,
} from './i18n/languages';
export { I18nextProvider as I18nProvider, useTranslation } from 'react-i18next';
