import {
  SUPPORTED_LANGUAGES,
  ShellContext,
  isSupportedLanguage,
  lineState,
  useTranslation,
  type ModuleEntry,
  type ShellApi,
  type ShellUser,
  type SignatureRequest,
  type SignatureResult,
} from '@iot/module-sdk';
import {
  AppShell,
  Button,
  Card,
  Header,
  LineSwitch,
  LoginForm,
  Sidebar,
  SidebarStatus,
  SignatureDialog,
  StateChip,
  UserBadge,
} from '@iot/ui';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { closeLineDataSource, sharedLineDataSource } from '../data-source';
import * as api from '../api';
import { ApiError, type ShellModule, type ShellState } from '../api';
import { initials } from '../format';
import { CORE_NAMESPACE, storeLanguage } from '../i18n';
import { localized } from '../localized';
import { AUDIT_ROUTE, CATALOG_ROUTE, routeUrl, useRoute } from '../router';
import { AuditPage } from './AuditPage';
import { Catalog } from './Catalog';
import { ModulePage } from './ModulePage';
import { buildSections, homeModuleId } from './navigation';

const noSubscribe = () => () => undefined;
const noSnapshot = () => null;

const can = (user: ShellUser, permission: string) =>
  user.permissions.includes('*') || user.permissions.includes(permission);

interface PendingSignature {
  moduleId: string;
  request: SignatureRequest;
  resolve: (result: SignatureResult | null) => void;
}

/** Fehlermeldung zu einer abgelehnten Anmeldung oder Signatur. */
function failureKey(prefix: 'login' | 'signature', error: unknown): string {
  if (!(error instanceof ApiError)) return `${prefix}.error`;
  if (error.status === 423) return `${prefix}.locked`;
  if (error.status === 403) return prefix === 'signature' ? 'signature.forbidden' : 'login.error';
  if (error.status === 401)
    return error.reason === 'inactive' ? 'login.inactive' : `${prefix}.invalid`;
  return `${prefix}.error`;
}

/** Shell der Plattform: Anmeldung, Layout, Navigation aus Manifesten, Baukasten, Audit Trail, e-Signatur. */
export function App() {
  const { t, i18n } = useTranslation(CORE_NAMESPACE);
  const language = i18n.resolvedLanguage ?? i18n.language;
  const [user, setUser] = useState<ShellUser | null | undefined>(undefined);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [state, setState] = useState<ShellState | null>(null);
  const [error, setError] = useState(false);
  const [entries, setEntries] = useState<ReadonlyMap<string, ModuleEntry>>(new Map());
  const [route, go] = useRoute();
  const [version, setVersion] = useState(0);
  const [pending, setPending] = useState<PendingSignature | null>(null);
  const [signError, setSignError] = useState<string | null>(null);
  const [signBusy, setSignBusy] = useState(false);
  // Titel, den eine Modulseite setzt (usePageTitle), gilt nur für die Route, auf der er gesetzt wurde
  const [pageTitle, setPageTitle] = useState<{ key: string; title: string } | null>(null);

  const reload = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  // Datenstrom nur für angemeldete Benutzer; neu bei jeder Anmeldung
  const dataSource = user ? sharedLineDataSource() : null;
  const lineData = useSyncExternalStore(
    dataSource?.subscribe ?? noSubscribe,
    dataSource?.getSnapshot ?? noSnapshot,
  );

  // Angemeldet? Ohne Sitzung erscheint die Anmeldung
  useEffect(() => {
    let cancelled = false;
    api.fetchMe().then(
      (me) => {
        if (!cancelled) setUser(me);
      },
      () => {
        if (!cancelled) setUser(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.fetchShellState().then(
      (next) => {
        if (cancelled) return;
        setState(next);
        setError(false);
      },
      (failure: unknown) => {
        if (cancelled) return;
        if (failure instanceof ApiError && failure.status === 401) setUser(null);
        else setError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [user, version]);

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
      await api.setBooked(module.id, !module.booked);
      reload();
    },
    [reload],
  );

  const submitLogin = useCallback(
    async (username: string, password: string) => {
      setLoginBusy(true);
      setLoginError(null);
      try {
        setUser(await api.login(username, password));
      } catch (failure) {
        setLoginError(t(failureKey('login', failure)));
      } finally {
        setLoginBusy(false);
      }
    },
    [t],
  );

  const signOut = useCallback(async () => {
    await api.logout();
    closeLineDataSource();
    setUser(null);
    setState(null);
  }, []);

  const finishSignature = (result: SignatureResult | null) => {
    pending?.resolve(result);
    setPending(null);
    setSignError(null);
  };

  const submitSignature = async (credentials: { username: string; password: string }) => {
    const current = pending;
    if (!current) return;
    setSignBusy(true);
    setSignError(null);
    try {
      finishSignature(await api.sign(current.moduleId, credentials, current.request));
    } catch (failure) {
      setSignError(t(failureKey('signature', failure)));
    } finally {
      setSignBusy(false);
    }
  };

  const modules = useMemo(() => state?.modules ?? [], [state]);
  const moduleId = route.moduleId || homeModuleId(modules);
  const current = modules.find((m) => m.id === moduleId);
  const routeKey = `${moduleId}|${route.path}|${JSON.stringify(route.params)}`;

  const shell = useMemo<ShellApi | null>(
    () =>
      state && user && dataSource
        ? {
            line: state.line,
            user,
            params: route.params,
            navigate: (id, params = {}, path = '') => {
              go(routeUrl(id, path, params));
            },
            isModuleBooked: (id) => modules.some((m) => m.id === id && m.booked),
            recordAudit: async (module, record) => {
              const entry = await api.recordAudit(module, record);
              return { seq: entry.seq, ts: entry.ts };
            },
            requestSignature: (module, request) =>
              new Promise<SignatureResult | null>((resolve) => {
                setSignError(null);
                setPending({ moduleId: module, request, resolve });
              }),
            data: dataSource,
            hasDeepLinkTarget: (module, kind, id) =>
              modules.some(
                (m) =>
                  m.id === module &&
                  m.booked &&
                  m.installed &&
                  (m.targets[kind] ?? []).includes(id),
              ),
            setPageTitle: (title) => {
              setPageTitle(title === null ? null : { key: routeKey, title });
            },
          }
        : null,
    [state, user, route.params, go, modules, dataSource, routeKey],
  );

  if (user === undefined) return <p>{t('app.loading')}</p>;
  if (user === null) {
    return (
      <LoginForm
        productName={t('app.productName')}
        error={loginError}
        busy={loginBusy}
        onSubmit={(username, password) => void submitLogin(username, password)}
      />
    );
  }
  if (error) return <Card role="alert">{t('app.loadError')}</Card>;
  if (!state || !shell) return <p>{t('app.loading')}</p>;

  const canBook = can(user, 'core.modules.book');
  const currentLineState = lineData ? lineState(lineData) : null;
  const canAudit = can(user, 'core.audit.view');

  const title =
    moduleId === CATALOG_ROUTE
      ? t('catalog.title')
      : moduleId === AUDIT_ROUTE && canAudit
        ? t('audit.title')
        : pageTitle?.key === routeKey
          ? pageTitle.title
          : current
            ? localized(
                current.manifest?.routes.find((r) => r.path === route.path)?.title ?? current.name,
                language,
              )
            : t('module.notFound');

  const sections = buildSections({
    modules,
    entries,
    line: lineData,
    activeId: moduleId,
    language,
    sectionLabel: (s) => t(`nav.section.${s}`),
    catalogLabel: t('nav.catalog'),
    audit: canAudit ? { label: t('nav.audit') } : null,
    go: (id) => {
      go(routeUrl(id));
    },
  });

  const page =
    moduleId === CATALOG_ROUTE ? (
      <Catalog
        modules={modules}
        canBook={canBook}
        onToggle={(m) => void toggle(m)}
        onOpen={(id) => {
          go(routeUrl(id));
        }}
      />
    ) : moduleId === AUDIT_ROUTE && canAudit ? (
      <AuditPage timeZone={state.line.timeZone} />
    ) : current ? (
      <ModulePage
        key={current.id}
        module={current}
        path={route.path}
        {...(canBook ? { onActivate: () => void toggle(current) } : {})}
        onOpenCatalog={() => {
          go(routeUrl(CATALOG_ROUTE));
        }}
        onLoaded={onLoaded}
      />
    ) : (
      <Card>{t('module.notFound')}</Card>
    );

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
            {currentLineState && (
              <StateChip state={currentLineState} prefix={t('line.state')} dot="md" />
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
            <UserBadge
              initials={initials(user.displayName)}
              name={user.displayName}
              roleLabel={user.roles.map((r) => localized(r.name, language)).join(', ')}
            />
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              {t('user.logout')}
            </Button>
          </Header>
        }
      >
        {page}
      </AppShell>
      <SignatureDialog
        open={pending !== null}
        meaning={pending?.request.meaning ?? ''}
        {...(pending?.request.subject ? { subject: pending.request.subject } : {})}
        error={signError}
        busy={signBusy}
        onSign={(credentials) => void submitSignature(credentials)}
        onCancel={() => {
          finishSignature(null);
        }}
      />
    </ShellContext.Provider>
  );
}
