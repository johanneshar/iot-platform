import {
  SUPPORTED_LANGUAGES,
  ShellContext,
  isSupportedLanguage,
  useTranslation,
  type ModuleEntry,
  type ShellApi,
} from '@iot/module-sdk';
import { AppShell, Card, Header, LineSwitch, Sidebar, SidebarStatus } from '@iot/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchShellState, setBooked, type ShellModule, type ShellState } from '../api';
import { CORE_NAMESPACE, storeLanguage } from '../i18n';
import { localized } from '../localized';
import { CATALOG_ROUTE, routeUrl, useRoute } from '../router';
import { Catalog } from './Catalog';
import { ModulePage } from './ModulePage';
import { buildSections, homeModuleId } from './navigation';

/** Shell der Plattform: Layout, Navigation aus Manifesten, Linienwahl, Sperrbildschirm, Baukasten. */
export function App() {
  const { t, i18n } = useTranslation(CORE_NAMESPACE);
  const language = i18n.resolvedLanguage ?? i18n.language;
  const [state, setState] = useState<ShellState | null>(null);
  const [error, setError] = useState(false);
  const [entries, setEntries] = useState<ReadonlyMap<string, ModuleEntry>>(new Map());
  const [route, go] = useRoute();

  // Neuladen über einen Zähler: der Effekt holt den Zustand, Antworten setzen ihn asynchron
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchShellState().then(
      (next) => {
        if (cancelled) return;
        setState(next);
        setError(false);
      },
      () => {
        if (!cancelled) setError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [version]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const onLoaded = useCallback((id: string, entry: ModuleEntry) => {
    setEntries((current) =>
      current.get(id) === entry ? current : new Map(current).set(id, entry),
    );
  }, []);

  const toggle = useCallback(
    async (module: ShellModule) => {
      await setBooked(module.id, !module.booked);
      reload();
    },
    [reload],
  );

  const modules = useMemo(() => state?.modules ?? [], [state]);
  const moduleId = route.moduleId || homeModuleId(modules);
  const current = modules.find((m) => m.id === moduleId);

  const shell = useMemo<ShellApi | null>(
    () =>
      state && {
        line: state.line,
        params: route.params,
        navigate: (id, params = {}, path = '') => {
          go(routeUrl(id, path, params));
        },
        isModuleBooked: (id) => modules.some((m) => m.id === id && m.booked),
      },
    [state, route.params, go, modules],
  );

  if (error) return <Card role="alert">{t('app.loadError')}</Card>;
  if (!state || !shell) return <p>{t('app.loading')}</p>;

  const title =
    moduleId === CATALOG_ROUTE
      ? t('catalog.title')
      : current
        ? localized(
            current.manifest?.routes.find((r) => r.path === route.path)?.title ?? current.name,
            language,
          )
        : t('module.notFound');

  const sections = buildSections({
    modules,
    entries,
    activeId: moduleId,
    language,
    sectionLabel: (s) => t(`nav.section.${s}`),
    catalogLabel: t('nav.catalog'),
    go: (id) => {
      go(routeUrl(id));
    },
  });

  return (
    <ShellContext.Provider value={shell}>
      <AppShell
        sidebar={
          <Sidebar
            title={t('app.productName')}
            subtitle={t('app.logoPlaceholder')}
            navLabel={t('app.navigation')}
            sections={sections}
            footer={<SidebarStatus title={t('app.edgeOnline')} online lines={[state.line.name]} />}
          />
        }
        header={
          <Header title={title} eyebrow={state.line.name}>
            {state.lines.length > 1 && (
              <LineSwitch
                label={t('line.select')}
                lines={state.lines.map((l) => ({ id: l.id, label: l.name }))}
                value={state.line.id}
                onChange={(lineId) => {
                  const target = state.lines.find((l) => l.id === lineId);
                  // Jede Linie hat ihren eigenen Core (E-23): gleiche Seite auf dem anderen Edge Device
                  if (target) window.location.assign(`${target.url}${window.location.pathname}`);
                }}
              />
            )}
            <LineSwitch
              label={t('language.label')}
              lines={SUPPORTED_LANGUAGES.map((l) => ({ id: l.code, label: l.nativeName }))}
              value={language}
              onChange={(code) => {
                if (!isSupportedLanguage(code)) return;
                storeLanguage(code);
                void i18n.changeLanguage(code);
              }}
            />
          </Header>
        }
      >
        {moduleId === CATALOG_ROUTE ? (
          <Catalog
            modules={modules}
            onToggle={(m) => void toggle(m)}
            onOpen={(id) => {
              go(routeUrl(id));
            }}
          />
        ) : current ? (
          <ModulePage
            key={current.id}
            module={current}
            path={route.path}
            onActivate={() => void toggle(current)}
            onOpenCatalog={() => {
              go(routeUrl(CATALOG_ROUTE));
            }}
            onLoaded={onLoaded}
          />
        ) : (
          <Card>{t('module.notFound')}</Card>
        )}
      </AppShell>
    </ShellContext.Provider>
  );
}
