import type { LocalizedText } from '@iot/module-sdk/manifest';

export interface RoleDefinition {
  id: string;
  name: LocalizedText;
  /** Rechte `<modul>.<aktion>`; `*` = alle Rechte (Service, E-12) */
  permissions: string[];
}

/** Rechte eines Benutzers: Vereinigung der Rechte aller seiner Rollen. */
export function permissionsFor(
  roleIds: readonly string[],
  roles: readonly RoleDefinition[],
): string[] {
  const set = new Set<string>();
  for (const id of roleIds) roles.find((r) => r.id === id)?.permissions.forEach((p) => set.add(p));
  return [...set].sort();
}

export function hasPermission(permissions: readonly string[], permission: string): boolean {
  return permissions.includes('*') || permissions.includes(permission);
}
