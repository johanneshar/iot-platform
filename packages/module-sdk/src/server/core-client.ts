import { validateManifest, type ModuleManifest } from '../manifest';
import type { ShiftDefinition } from '../time';

export interface CoreConnection {
  coreUrl: string;
  /** Dienst-Token der Registry (CORE_REGISTRY_TOKEN, O-18) */
  token: string;
  log?: (message: string) => void;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendWithRetry(
  connection: CoreConnection,
  method: string,
  path: string,
  body: unknown,
): Promise<void> {
  const log = connection.log ?? console.log;
  for (;;) {
    try {
      const response = await fetch(`${connection.coreUrl}${path}`, {
        method,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${connection.token}`,
        },
        body: JSON.stringify(body),
      });
      if (response.ok) return;
      log(`Core lehnt ${method} ${path} ab: ${String(response.status)} ${await response.text()}`);
    } catch {
      log(`Core ${connection.coreUrl} nicht erreichbar – neuer Versuch in 5 s`);
    }
    await wait(5_000);
  }
}

/** Meldet das Manifest beim Core an; versucht es alle 5 s, bis der Core erreichbar ist. */
export async function registerWithCore(
  connection: CoreConnection,
  manifest: ModuleManifest,
): Promise<void> {
  const check = validateManifest(manifest);
  if (!check.ok) throw new Error(`Manifest ungültig: ${check.errors.join('; ')}`);
  await sendWithRetry(connection, 'POST', '/api/registry/modules', manifest);
  (connection.log ?? console.log)(`beim Core ${connection.coreUrl} angemeldet`);
}

/**
 * Meldet, wofür dieses Modul Einsprungpunkte hat – z. B. `{ alarm: ['FILL-WGT-0003'] }` für Alarme mit
 * Fehlerbaum. Andere Module fragen das über `useDeepLinkAvailable` ab, ohne mit diesem Modul zu sprechen.
 */
export async function publishDeepLinkTargets(
  connection: CoreConnection,
  moduleId: string,
  targets: Record<string, string[]>,
): Promise<void> {
  await sendWithRetry(
    connection,
    'PUT',
    `/api/registry/modules/${encodeURIComponent(moduleId)}/targets`,
    targets,
  );
}

/** Linie dieses Edge Device aus der Konfiguration des Core: Zeitzone, Schichtmodell, OEE-Ziel. */
export interface LineConfig {
  id: string;
  name: string;
  timeZone: string;
  shifts: ShiftDefinition[];
  oeeTarget: number | null;
}

/** Holt die Linienkonfiguration beim Core (Dienst-Token); versucht es alle 5 s, bis der Core antwortet. */
export async function fetchLineConfig(connection: CoreConnection): Promise<LineConfig> {
  const log = connection.log ?? console.log;
  for (;;) {
    try {
      const response = await fetch(`${connection.coreUrl}/api/registry/line`, {
        headers: { authorization: `Bearer ${connection.token}` },
      });
      if (response.ok) return (await response.json()) as LineConfig;
      log(`Core lehnt GET /api/registry/line ab: ${String(response.status)}`);
    } catch {
      log(`Core ${connection.coreUrl} nicht erreichbar – neuer Versuch in 5 s`);
    }
    await wait(5_000);
  }
}
