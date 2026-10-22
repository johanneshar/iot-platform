import { useCallback, useEffect, useState } from 'react';

/** Seite des Baukastens; die ID ist in RESERVED_MODULE_IDS reserviert. */
export const CATALOG_ROUTE = 'baukasten';

export interface Route {
  /** Modul-ID oder CATALOG_ROUTE; leer = Startseite */
  moduleId: string;
  /** Pfad innerhalb des Moduls */
  path: string;
  params: Record<string, string>;
}

export function parseRoute(pathname: string, search: string): Route {
  const [moduleId = '', ...rest] = pathname.replace(/^\/+|\/+$/g, '').split('/');
  return {
    moduleId: decodeURIComponent(moduleId),
    path: rest.map(decodeURIComponent).join('/'),
    params: Object.fromEntries(new URLSearchParams(search)),
  };
}

export function routeUrl(moduleId: string, path = '', params: Record<string, string> = {}): string {
  const query = new URLSearchParams(params).toString();
  const segments = [moduleId, ...(path ? path.split('/') : [])].map(encodeURIComponent).join('/');
  return `/${segments}${query ? `?${query}` : ''}`;
}

/** Einfacher Router über die History-API. */
export function useRoute(): [Route, (url: string) => void] {
  const read = () => parseRoute(window.location.pathname, window.location.search);
  const [route, setRoute] = useState<Route>(read);

  useEffect(() => {
    const onPop = () => {
      setRoute(read());
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  const go = useCallback((url: string) => {
    window.history.pushState(null, '', url);
    setRoute(read());
  }, []);

  return [route, go];
}
