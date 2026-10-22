import type { ComponentType } from 'react';
import type { LanguageCode } from '../i18n/languages';

/** Text je Sprache; Deutsch ist Pflicht, weitere Sprachen optional. */
export type LocalizedText = { de: string } & Partial<Record<LanguageCode, string>>;

export const MODULE_CATEGORIES = ['Kern', 'Produktion', 'Instandhaltung', 'Integration'] as const;
export type ModuleCategory = (typeof MODULE_CATEGORIES)[number];

export const NAV_SECTIONS = ['Linie', 'Service', 'Plattform'] as const;
export type NavSection = (typeof NAV_SECTIONS)[number];

export const CONFORMANCE_LEVELS = ['basic', 'standard', 'full'] as const;
export type Conformance = (typeof CONFORMANCE_LEVELS)[number];

/** Icons aus @iot/ui (Name wie in `ICON_NAMES`). */
export type ModuleIcon =
  | 'overview'
  | 'alarms'
  | 'batch'
  | 'condition'
  | 'prediction'
  | 'troubleshooting'
  | 'format'
  | 'spares'
  | 'modules';

/** Recht im Format `<modulId>.<aktion>`, z. B. `alarms.acknowledge`. */
export type Permission = `${string}.${string}`;

export interface ModuleRoute {
  /** Pfad innerhalb des Moduls ohne führenden Schrägstrich; `''` = Startseite */
  path: string;
  title: LocalizedText;
}

/** Parameter eines Einsprungpunkts für andere Module (Name → Beschreibung). */
export type DeepLinkParams = Record<string, string>;

/**
 * Statischer Teil des Modul-Manifests (CLAUDE.md, Abschnitt 6.1). Das Modul-Backend meldet ihn beim Start
 * bei der Registry des Core an; er ist reines JSON.
 */
export interface ModuleManifest {
  /** kebab-case, eindeutig, unveränderlich */
  id: string;
  /** SemVer des Moduls */
  version: string;
  name: LocalizedText;
  /** Auch Text des Sperrbildschirms – ohne Schlusspunkt */
  description: LocalizedText;
  category: ModuleCategory;
  core?: boolean;
  gxp: boolean;
  minConformance: Conformance;
  ownMachinesOnly?: boolean;
  /** `label`: Text in der Navigation, falls er vom Produktnamen abweicht (z. B. „Alarme“ statt „Alarm-Analytics“) */
  nav?: { section: NavSection; order: number; icon: ModuleIcon; label?: LocalizedText };
  routes: ModuleRoute[];
  deepLinks?: Record<string, DeepLinkParams>;
  permissions: Permission[];
  /** Adresse des Einstiegsmoduls der Oberfläche (ES-Modul, ADR-002) */
  entry: string;
  /** Stylesheets des Moduls, lädt die Shell als <link> */
  styles?: string[];
}

export interface ModulePageProps {
  /** Pfad der aufgerufenen Seite innerhalb des Moduls */
  path: string;
}

/**
 * Laufzeitteil des Manifests: Standard-Export des Einstiegsmoduls. Enthält, was sich nicht als JSON
 * melden lässt (Komponenten, Funktionen).
 */
export interface ModuleEntry {
  /** Seite je Routenpfad aus dem Manifest */
  pages: Record<string, ComponentType<ModulePageProps>>;
  /** Zähler in der Navigation, z. B. aktive Alarme; `null` = keiner */
  badge?: () => number | null;
  /** Übersetzungen im Namespace der Modul-ID */
  translations?: Partial<Record<LanguageCode, Record<string, unknown>>>;
}

/** Hilfsfunktion für Einstiegsmodule – nur für die Typprüfung. */
export function defineModuleEntry(entry: ModuleEntry): ModuleEntry {
  return entry;
}
