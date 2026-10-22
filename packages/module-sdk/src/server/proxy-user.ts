import { timingSafeEqual } from 'node:crypto';

/** Benutzer, den der Core beim Weiterleiten an ein Modul-Backend mitgibt (E-36). */
export interface ProxyUser {
  username: string;
  displayName: string;
  /** `*` = alle Rechte (Service) */
  permissions: string[];
}

export const PROXY_USER_HEADER = 'x-iot-user';
export const PROXY_TOKEN_HEADER = 'x-iot-token';

type Headers = Record<string, string | string[] | undefined>;

const header = (headers: Headers, name: string): string | undefined => {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
};

const sameSecret = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

/** Kopfzeilen, mit denen der Core einen Aufruf an ein Modul-Backend weiterleitet. */
export function proxyHeaders(user: ProxyUser, token: string): Record<string, string> {
  return {
    [PROXY_USER_HEADER]: Buffer.from(JSON.stringify(user)).toString('base64url'),
    [PROXY_TOKEN_HEADER]: token,
  };
}

/**
 * Liest den angemeldeten Benutzer aus einem weitergeleiteten Aufruf. Ohne gültiges Dienst-Token oder ohne
 * Benutzer `null` – dann antwortet das Modul mit 401.
 */
export function readProxyUser(headers: Headers, token: string): ProxyUser | null {
  const sent = header(headers, PROXY_TOKEN_HEADER);
  const encoded = header(headers, PROXY_USER_HEADER);
  if (!sent || !encoded || !sameSecret(sent, token)) return null;
  try {
    const user = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as Partial<ProxyUser>;
    if (typeof user.username !== 'string' || !Array.isArray(user.permissions)) return null;
    return {
      username: user.username,
      displayName: user.displayName ?? user.username,
      permissions: user.permissions,
    };
  } catch {
    return null;
  }
}

export function userCan(user: ProxyUser, permission: string): boolean {
  return user.permissions.includes('*') || user.permissions.includes(permission);
}
