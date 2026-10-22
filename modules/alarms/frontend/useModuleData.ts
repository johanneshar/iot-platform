import { useModuleApi } from '@iot/module-sdk';
import { useEffect, useState } from 'react';

/** Lädt einen Pfad des eigenen Backends und aktualisiert ihn regelmäßig. */
// T beschreibt die Antwort des Backends – wie bei useModuleApi().get<T>
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function useModuleData<T>(
  path: string,
  refreshMs: number,
): { data: T | null; failed: boolean } {
  const api = useModuleApi();
  const [state, setState] = useState<{ data: T | null; failed: boolean }>({
    data: null,
    failed: false,
  });
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api.get<T>(path).then(
        (data) => {
          if (!cancelled) setState({ data, failed: false });
        },
        () => {
          if (!cancelled) setState((s) => ({ ...s, failed: true }));
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
  return state;
}
