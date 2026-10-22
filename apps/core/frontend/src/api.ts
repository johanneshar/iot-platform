import type { LocalizedText, ModuleCategory, ModuleManifest } from '@iot/module-sdk';

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
}

export interface SiteLine {
  id: string;
  name: string;
  url: string;
}

export interface ShellState {
  line: { id: string; name: string };
  lines: SiteLine[];
  modules: ShellModule[];
}

export async function fetchShellState(): Promise<ShellState> {
  const response = await fetch('/api/shell');
  if (!response.ok) throw new Error(`GET /api/shell: ${String(response.status)}`);
  return (await response.json()) as ShellState;
}

export async function setBooked(moduleId: string, booked: boolean): Promise<void> {
  const response = await fetch(`/api/licenses/${encodeURIComponent(moduleId)}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ booked }),
  });
  if (!response.ok) throw new Error(`PUT /api/licenses/${moduleId}: ${String(response.status)}`);
}
