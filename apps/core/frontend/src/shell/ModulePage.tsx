import { ModuleIdContext, useTranslation, type ModuleEntry } from '@iot/module-sdk';
import { Card, LockedModule } from '@iot/ui';
import { useEffect, useState } from 'react';
import type { ShellModule } from '../api';
import { CORE_NAMESPACE } from '../i18n';
import { localized } from '../localized';
import { loadModule } from '../module-loader';

interface ModulePageProps {
  module: ShellModule;
  path: string;
  /** Nur mit Recht core.modules.book (E-14) */
  onActivate?: () => void;
  onOpenCatalog: () => void;
  onLoaded: (id: string, entry: ModuleEntry) => void;
}

/** Zeigt eine Seite eines Moduls – oder den Sperrbildschirm, wenn es nicht gebucht ist. */
export function ModulePage({ module, path, onActivate, onOpenCatalog, onLoaded }: ModulePageProps) {
  const { t, i18n } = useTranslation(CORE_NAMESPACE);
  const [entry, setEntry] = useState<ModuleEntry | null>(null);
  const [failed, setFailed] = useState(false);
  const name = localized(module.name, i18n.language);
  const manifest = module.manifest;

  useEffect(() => {
    if (!module.booked || !manifest) return;
    // Die Seite entsteht je Modul neu (key in App), daher kein Zurücksetzen nötig
    let cancelled = false;
    loadModule(manifest, i18n).then(
      (loaded) => {
        if (cancelled) return;
        setEntry(loaded);
        onLoaded(module.id, loaded);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [module.id, module.booked, manifest, i18n, onLoaded]);

  if (!module.booked) {
    return (
      <LockedModule
        moduleName={name}
        description={localized(module.description, i18n.language)}
        {...(onActivate ? { onActivate } : {})}
        onOpenCatalog={onOpenCatalog}
      />
    );
  }
  if (!manifest) {
    return <Card>{t('module.notInstalled', { name })}</Card>;
  }
  if (failed) return <Card role="alert">{t('module.loadError', { name })}</Card>;
  if (!entry) return <p>{t('app.loading')}</p>;

  const Page = entry.pages[path];
  if (!Page) return <Card>{t('module.notFound')}</Card>;
  return (
    <ModuleIdContext.Provider value={module.id}>
      <Page path={path} />
    </ModuleIdContext.Provider>
  );
}
