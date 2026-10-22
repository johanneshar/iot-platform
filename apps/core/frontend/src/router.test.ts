import { describe, expect, it } from 'vitest';
import { parseRoute, routeUrl } from './router';

describe('Router', () => {
  it('zerlegt Modul, Pfad und Parameter', () => {
    expect(parseRoute('/spares/parts/detail', '?search=ET-10233')).toEqual({
      moduleId: 'spares',
      path: 'parts/detail',
      params: { search: 'ET-10233' },
    });
  });

  it('Startseite hat keine Modul-ID', () => {
    expect(parseRoute('/', '')).toEqual({ moduleId: '', path: '', params: {} });
  });

  it("baut Deep Links wie navigate('spares', { search })", () => {
    expect(routeUrl('spares', '', { search: 'ET-10233' })).toBe('/spares?search=ET-10233');
    expect(routeUrl('troubleshooting', 'tree/waage')).toBe('/troubleshooting/tree/waage');
  });

  it('kodiert Sonderzeichen', () => {
    const url = routeUrl('spares', '', { search: 'Wägezelle 0–50 g' });
    expect(parseRoute(url.split('?')[0] ?? '', `?${url.split('?')[1] ?? ''}`).params).toEqual({
      search: 'Wägezelle 0–50 g',
    });
  });
});
