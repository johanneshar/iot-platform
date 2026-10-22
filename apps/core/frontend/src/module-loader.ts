import type { ModuleEntry, ModuleManifest } from '@iot/module-sdk';
import type { i18n } from 'i18next';

const cache = new Map<string, Promise<ModuleEntry>>();

function addStyles(manifest: ModuleManifest): void {
  for (const href of manifest.styles ?? []) {
    if (document.querySelector(`link[data-module="${manifest.id}"][href="${href}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset['module'] = manifest.id;
    document.head.append(link);
  }
}

/**
 * Lädt das Einstiegsmodul eines Moduls als ES-Modul (ADR-002) und registriert seine Übersetzungen im
 * Namespace der Modul-ID. Jedes Modul wird nur einmal geladen.
 */
export function loadModule(manifest: ModuleManifest, i18n: i18n): Promise<ModuleEntry> {
  let pending = cache.get(manifest.id);
  if (!pending) {
    addStyles(manifest);
    pending = (import(/* @vite-ignore */ manifest.entry) as Promise<{ default: ModuleEntry }>).then(
      ({ default: entry }) => {
        for (const [language, resources] of Object.entries(entry.translations ?? {})) {
          i18n.addResourceBundle(language, manifest.id, resources, true, true);
        }
        return entry;
      },
    );
    cache.set(manifest.id, pending);
    pending.catch(() => cache.delete(manifest.id));
  }
  return pending;
}
