import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { LineSnapshot } from '../data/types';
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

/** Live-Daten der Linie aus dem Datenkern des Core (ADR-005). */
export interface LineDataSource {
  getSnapshot: () => LineSnapshot | null;
  subscribe: (listener: () => void) => () => void;
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
  /** Maschinendaten der Linie */
  data: LineDataSource;
  /** Hat das (gebuchte, installierte) Modul einen Einsprungpunkt, z. B. `('troubleshooting', 'alarm', id)`? */
  hasDeepLinkTarget: (moduleId: string, kind: string, id: string) => boolean;
  /** Seitentitel im Kopf statt des Routentitels aus dem Manifest; `null` = Routentitel */
  setPageTitle: (title: string | null) => void;
}

export const ShellContext = createContext<ShellApi | null>(null);

/** Modul-ID der aktuell gerenderten Seite; die Shell setzt sie je Modul. */
export const ModuleIdContext = createContext<string>('core');

export function useShell(): ShellApi {
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

/** Ist ein Deep Link möglich – z. B. „Fehlersuche starten“ nur für Alarme mit Fehlerbaum? */
export function useDeepLinkAvailable(moduleId: string, kind: string, id: string): boolean {
  return useShell().hasDeepLinkTarget(moduleId, kind, id);
}

/** Prüfer für viele Einträge auf einmal, z. B. eine Alarmliste. */
export function useDeepLinkTargets(): ShellApi['hasDeepLinkTarget'] {
  return useShell().hasDeepLinkTarget;
}

/** Seitentitel im Kopf, z. B. der Name der Maschine auf ihrer Detailseite; `null` = Routentitel. */
export function usePageTitle(title: string | null): void {
  const { setPageTitle } = useShell();
  useEffect(() => {
    setPageTitle(title);
    return () => {
      setPageTitle(null);
    };
  }, [title, setPageTitle]);
}

/** Fehler eines Aufrufs an das eigene Modul-Backend. */
export class ModuleApiError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${String(status)}`);
  }
}

export interface ModuleApi {
  get: <T>(path: string) => Promise<T>;
  post: <T>(path: string, body: unknown) => Promise<T>;
}

/**
 * Aufrufe an das eigene Modul-Backend – über den Proxy des Core, mit der Sitzung des Benutzers (E-36).
 * Das Objekt bleibt je Modul gleich und kann in Abhängigkeitslisten von Effekten stehen.
 */
export function useModuleApi(): ModuleApi {
  const moduleId = useContext(ModuleIdContext);
  return useMemo(() => moduleApi(moduleId), [moduleId]);
}

function moduleApi(moduleId: string): ModuleApi {
  const base = `/api/modules/${encodeURIComponent(moduleId)}/`;
  const call = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const response = await fetch(`${base}${path.replace(/^\//, '')}`, {
      method,
      credentials: 'same-origin',
      ...(body === undefined
        ? {}
        : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new ModuleApiError(response.status);
    return (response.status === 204 ? undefined : await response.json()) as T;
  };
  return { get: (path) => call('GET', path), post: (path, body) => call('POST', path, body) };
}

/**
 * Lädt einen Pfad des eigenen Backends und aktualisiert ihn regelmäßig. `path: null` lädt nichts.
 * Bei einem Fehler bleiben die letzten Daten stehen und `failed` wird gesetzt.
 */
// T beschreibt die Antwort des Backends – wie bei useModuleApi().get<T>
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function useModuleData<T>(
  path: string | null,
  refreshMs = 30_000,
): { data: T | null; failed: boolean } {
  const api = useModuleApi();
  const [state, setState] = useState<{ path: string | null; data: T | null; failed: boolean }>({
    path,
    data: null,
    failed: false,
  });
  useEffect(() => {
    if (path === null) return;
    let cancelled = false;
    const load = () => {
      api.get<T>(path).then(
        (data) => {
          if (!cancelled) setState({ path, data, failed: false });
        },
        () => {
          if (!cancelled) setState((s) => ({ ...s, path, failed: true }));
        },
      );
    };
    load();
    const timer = setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [api, path, refreshMs]);
  // Daten eines anderen Pfads (z. B. vorheriger Zeitraum) nicht als aktuelle ausgeben
  return state.path === path
    ? { data: state.data, failed: state.failed }
    : { data: null, failed: false };
}
