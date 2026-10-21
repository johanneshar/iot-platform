import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderUi } from '../../test/render';
import { NavItem } from './NavItem';

afterEach(cleanup);

describe('NavItem', () => {
  it('kennzeichnet die aktive Seite', async () => {
    await renderUi(<NavItem icon="overview" label="Linienübersicht" active />);
    expect(screen.getByRole('button').getAttribute('aria-current')).toBe('page');
  });

  it('zeigt bei gesperrtem Modul ein beschriftetes Schloss', async () => {
    await renderUi(<NavItem icon="condition" label="Condition Monitoring" locked />);
    expect(screen.getByRole('img', { name: 'nicht gebucht' })).toBeDefined();
  });

  it('übersetzt die Schloss-Beschriftung', async () => {
    await renderUi(<NavItem icon="condition" label="Condition Monitoring" locked />, 'en');
    expect(screen.getByRole('img', { name: 'not booked' })).toBeDefined();
  });

  it('zeigt den Zähler', async () => {
    await renderUi(<NavItem icon="alarms" label="Alarme" badge={3} />);
    expect(screen.getByRole('button', { name: /Alarme\s*3/ })).toBeDefined();
  });
});
