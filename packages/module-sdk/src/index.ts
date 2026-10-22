export { createI18n, type CreateI18nOptions, type Translations } from './i18n/create-i18n';
export {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  resolveLanguage,
  type LanguageCode,
} from './i18n/languages';
export {
  CONFORMANCE_LEVELS,
  MODULE_CATEGORIES,
  NAV_SECTIONS,
  defineModuleEntry,
  type Conformance,
  type DeepLinkParams,
  type LocalizedText,
  type ModuleCategory,
  type ModuleEntry,
  type ModuleIcon,
  type ModuleManifest,
  type ModulePageProps,
  type ModuleRoute,
  type NavSection,
  type Permission,
} from './manifest/manifest';
export { validateManifest, type ManifestResult } from './manifest/validate-manifest';
export {
  ShellContext,
  useDeepLinkParams,
  useIsModuleBooked,
  useLine,
  useNavigate,
  type LineInfo,
  type ShellApi,
} from './shell/shell-context';
export { I18nextProvider as I18nProvider, useTranslation } from 'react-i18next';
