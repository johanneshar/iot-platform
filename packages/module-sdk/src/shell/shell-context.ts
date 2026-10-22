import { createContext, useContext } from 'react';
import type { LocalizedText } from '../manifest/manifest';

export interface LineInfo {
  id: string;
  name: string;
  /** Zeitzone des Standorts – Anzeige von Zeitstempeln (E-19) */
  timeZone: string;
}

export interface ShellUser {
  username: string;
  displayName: string;
  roles: { id: string; name: LocalizedText }[];
  /** Rechte aus allen Rollen; `*` = alle (Service) */
  permissions: string[];
}

/** Vorgang für den Audit Trail; Benutzer und Zeitstempel (UTC) setzt der Core. */
export interface AuditRecord {
  /** `<modul>.<vorgang>`, z. B. `format.step-confirmed` */
  action: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

export interface SignatureRequest {
  /** Bedeutung, z. B. „Freigabe“ (E-13) */
  meaning: string;
  /** Recht, das der Signierende haben muss, z. B. `batch.sign` */
  permission: string;
  /** `<modul>.<vorgang>`, z. B. `batch.report-signed` */
  action: string;
  /** Was signiert wird – erscheint im Dialog */
  subject?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

export interface SignatureResult {
  /** Laufende Nummer des Eintrags im Audit Trail */
  seq: number;
  /** UTC */
  ts: string;
  username: string;
  userName: string;
  meaning: string;
}

/** Was die Shell jedem Modul bereitstellt (CLAUDE.md, Abschnitt 6.2). */
export interface ShellApi {
  line: LineInfo;
  user: ShellUser;
  /** Zu einem Modul springen, optional mit Deep-Link-Parametern; nicht gebuchte Module zeigen den Sperrbildschirm */
  navigate: (moduleId: string, params?: Record<string, string>, path?: string) => void;
  /** Parameter des aktuellen Aufrufs (Query-String) */
  params: Readonly<Record<string, string>>;
  isModuleBooked: (moduleId: string) => boolean;
  /** Vorgang des Moduls `moduleId` im zentralen Audit Trail erfassen */
  recordAudit: (moduleId: string, record: AuditRecord) => Promise<void>;
  /** e-Signatur anfordern; `null`, wenn der Benutzer abbricht */
  requestSignature: (
    moduleId: string,
    request: SignatureRequest,
  ) => Promise<SignatureResult | null>;
}

export const ShellContext = createContext<ShellApi | null>(null);

/** Modul-ID der aktuell gerenderten Seite; die Shell setzt sie je Modul. */
export const ModuleIdContext = createContext<string>('core');

function useShell(): ShellApi {
  const shell = useContext(ShellContext);
  if (!shell) throw new Error('Komponente läuft außerhalb der Shell (ShellContext fehlt)');
  return shell;
}

/** Linie dieses Edge Device. */
export function useLine(): LineInfo {
  return useShell().line;
}

/** Angemeldeter Benutzer. */
export function useUser(): ShellUser {
  return useShell().user;
}

/** Hat der angemeldete Benutzer dieses Recht? */
export function usePermission(permission: string): boolean {
  const { permissions } = useShell().user;
  return permissions.includes('*') || permissions.includes(permission);
}

/** Navigation über die Shell – Module rufen einander nie direkt auf. */
export function useNavigate(): ShellApi['navigate'] {
  return useShell().navigate;
}

/** Parameter eines Deep Links, z. B. `{ search: 'ET-10233' }`. */
export function useDeepLinkParams(): Readonly<Record<string, string>> {
  return useShell().params;
}

/** Ist ein Modul auf dieser Linie gebucht? */
export function useIsModuleBooked(): ShellApi['isModuleBooked'] {
  return useShell().isModuleBooked;
}

/** `audit.record(...)` – GxP-relevante Vorgänge gehen immer über den Core (CLAUDE.md, Abschnitt 4). */
export function useAudit(): { record: (record: AuditRecord) => Promise<void> } {
  const shell = useShell();
  const moduleId = useContext(ModuleIdContext);
  return { record: (record) => shell.recordAudit(moduleId, record) };
}

/** `requestSignature(...)` – öffnet den Signaturdialog der Shell. */
export function useRequestSignature(): (
  request: SignatureRequest,
) => Promise<SignatureResult | null> {
  const shell = useShell();
  const moduleId = useContext(ModuleIdContext);
  return (request) => shell.requestSignature(moduleId, request);
}
