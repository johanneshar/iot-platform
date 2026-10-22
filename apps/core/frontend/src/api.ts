import type {
  AuditRecord,
  LocalizedText,
  ModuleCategory,
  ModuleManifest,
  ShellUser,
  SignatureRequest,
  SignatureResult,
} from '@iot/module-sdk';

/** Antwort von GET /api/shell (apps/core/backend/src/shell-state.ts). */
export interface ShellModule {
  id: string;
  category: ModuleCategory;
  name: LocalizedText;
  description: LocalizedText;
  core: boolean;
  gxp: boolean;
  booked: boolean;
  installed: boolean;
  manifest?: ModuleManifest;
  targets: Record<string, string[]>;
}

export interface SiteLine {
  id: string;
  name: string;
  url: string;
  timeZone: string;
}

export interface ShellState {
  line: { id: string; name: string; timeZone: string };
  lines: SiteLine[];
  modules: ShellModule[];
}

export interface AuditEntry {
  seq: number;
  ts: string;
  username: string;
  userName: string;
  action: string;
  module: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  meaning: string | null;
}

/** Fehler mit HTTP-Status, damit die Oberfläche passend reagiert (401, 403, 423 …). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string | undefined,
  ) {
    super(`HTTP ${String(status)}${reason ? `: ${reason}` : ''}`);
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: 'same-origin',
    ...(body === undefined
      ? {}
      : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { errors?: string[] };
    throw new ApiError(response.status, data.errors?.[0]);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export const fetchMe = () => request<ShellUser>('GET', '/api/auth/me');
export const login = (username: string, password: string) =>
  request<ShellUser>('POST', '/api/auth/login', { username, password });
export const logout = () => request<undefined>('POST', '/api/auth/logout');
export const fetchShellState = () => request<ShellState>('GET', '/api/shell');
export const setBooked = (moduleId: string, booked: boolean) =>
  request<undefined>('PUT', `/api/licenses/${encodeURIComponent(moduleId)}`, { booked });
export const recordAudit = (module: string, record: AuditRecord) =>
  request<AuditEntry>('POST', '/api/audit', { module, ...record });
export const sign = (
  module: string,
  credentials: { username: string; password: string },
  signature: SignatureRequest,
) => {
  // `subject` ist nur Anzeige im Dialog; der Rest geht in den Audit Trail
  const { meaning, permission, action, oldValue, newValue, reason } = signature;
  return request<SignatureResult>('POST', '/api/signatures', {
    module,
    ...credentials,
    meaning,
    permission,
    action,
    oldValue,
    newValue,
    reason,
  });
};
export const fetchAudit = () => request<AuditEntry[]>('GET', '/api/audit?limit=500');
export const verifyAudit = () =>
  request<{ valid: boolean; count: number; brokenAt: number | null }>('GET', '/api/audit/verify');
