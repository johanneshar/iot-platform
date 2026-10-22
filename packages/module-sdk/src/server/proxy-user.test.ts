import { describe, expect, it } from 'vitest';
import { proxyHeaders, readProxyUser, userCan } from './proxy-user';

const user = {
  username: 'maintenance',
  displayName: '[Maintenance]',
  permissions: ['troubleshooting.document'],
};

describe('Benutzer aus dem Proxy', () => {
  it('liest den Benutzer mit gültigem Dienst-Token', () => {
    expect(readProxyUser(proxyHeaders(user, 'geheim'), 'geheim')).toEqual(user);
  });

  it('ohne oder mit falschem Token kein Benutzer', () => {
    expect(readProxyUser(proxyHeaders(user, 'falsch'), 'geheim')).toBeNull();
    expect(readProxyUser({}, 'geheim')).toBeNull();
  });

  it('prüft Rechte; * gilt für alle', () => {
    expect(userCan(user, 'troubleshooting.document')).toBe(true);
    expect(userCan(user, 'batch.sign')).toBe(false);
    expect(userCan({ ...user, permissions: ['*'] }, 'batch.sign')).toBe(true);
  });
});
