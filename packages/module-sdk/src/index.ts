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
export { RESERVED_MODULE_IDS, SHARED_MODULES } from './manifest/shared-modules';
export {
  useAlarms,
  useCounters,
  useLineData,
  useMachine,
  useMachineState,
  useMachines,
  useValues,
  type LineAlarm,
  type ProcessValue,
} from './shell/data-hooks';
export {
  currentRate,
  findBottleneck,
  lineState,
  machinesInOrder,
  type ActiveAlarm,
  type CounterSample,
  type DataQuality,
  type LineSnapshot,
  type MachineSnapshot,
  type PackMLState,
  type StatePeriod,
} from './data';
export { currentShift, localTimeToUtc, type ShiftDefinition } from './time';
export {
  ModuleApiError,
  ModuleIdContext,
  ShellContext,
  useDeepLinkAvailable,
  useDeepLinkTargets,
  useModuleApi,
  useModuleData,
  usePageTitle,
  useAudit,
  useDeepLinkParams,
  useIsModuleBooked,
  useLine,
  useNavigate,
  usePermission,
  useRequestSignature,
  useUser,
  type AuditRecord,
  type LineDataSource,
  type LineInfo,
  type ModuleApi,
  type ShellApi,
  type ShellUser,
  type SignatureRequest,
  type SignatureResult,
} from './shell/shell-context';
export { I18nextProvider as I18nProvider, useTranslation } from 'react-i18next';
