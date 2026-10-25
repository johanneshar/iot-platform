import { useSyncExternalStore } from 'react';

/**
 * Anfrageliste der Sitzung: von der Seite befüllt, als Zähler in der Navigation (Mockup).
 * Liegt im Speicher des Einstiegsmoduls und überlebt ein Neuladen über sessionStorage.
 */
const STORAGE_KEY = 'iot.spares.request-list';

const read = (): string[] => {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

let items: readonly string[] = typeof sessionStorage === 'undefined' ? [] : read();
const listeners = new Set<() => void>();

const set = (next: readonly string[]) => {
  items = next;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ohne Speicher bleibt die Liste nur bis zum Neuladen
  }
  listeners.forEach((listener) => {
    listener();
  });
};

export const requestList = {
  get: (): readonly string[] => items,
  toggle: (id: string) => {
    set(items.includes(id) ? items.filter((i) => i !== id) : [...items, id]);
  },
  remove: (id: string) => {
    set(items.filter((i) => i !== id));
  },
  clear: () => {
    set([]);
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useRequestList(): readonly string[] {
  return useSyncExternalStore(requestList.subscribe, requestList.get, requestList.get);
}
