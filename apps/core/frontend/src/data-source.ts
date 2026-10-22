import type { LineDataSource, LineSnapshot } from '@iot/module-sdk';

/**
 * Live-Daten der Linie aus dem Datenkern des Core (`/api/data/stream`, Server-Sent Events). Die Verbindung
 * baut der Browser bei Abbruch selbst wieder auf.
 */
export function createLineDataSource(
  url = '/api/data/stream',
): LineDataSource & { close: () => void } {
  let snapshot: LineSnapshot | null = null;
  const listeners = new Set<() => void>();
  const events = new EventSource(url, { withCredentials: true });

  events.addEventListener('line', (event: MessageEvent<string>) => {
    snapshot = JSON.parse(event.data) as LineSnapshot;
    listeners.forEach((listener) => {
      listener();
    });
  });

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close: () => {
      events.close();
    },
  };
}

let shared: (LineDataSource & { close: () => void }) | null = null;

/** Eine Verbindung je Anmeldung – unabhängig davon, wie oft React rendert. */
export function sharedLineDataSource(): LineDataSource {
  shared ??= createLineDataSource();
  return shared;
}

/** Beim Abmelden die Verbindung schließen. */
export function closeLineDataSource(): void {
  shared?.close();
  shared = null;
}
