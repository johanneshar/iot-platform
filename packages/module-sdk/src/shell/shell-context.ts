import { createContext, useContext } from 'react';

export interface LineInfo {
  id: string;
  name: string;
}

/** Was die Shell jedem Modul bereitstellt (CLAUDE.md, Abschnitt 6.2). */
export interface ShellApi {
  line: LineInfo;
  /** Zu einem Modul springen, optional mit Deep-Link-Parametern; nicht gebuchte Module zeigen den Sperrbildschirm */
  navigate: (moduleId: string, params?: Record<string, string>, path?: string) => void;
  /** Parameter des aktuellen Aufrufs (Query-String) */
  params: Readonly<Record<string, string>>;
  isModuleBooked: (moduleId: string) => boolean;
}

export const ShellContext = createContext<ShellApi | null>(null);

function useShell(): ShellApi {
  const shell = useContext(ShellContext);
  if (!shell) throw new Error('Komponente läuft außerhalb der Shell (ShellContext fehlt)');
  return shell;
}

/** Linie dieses Edge Device. */
export function useLine(): LineInfo {
  return useShell().line;
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
