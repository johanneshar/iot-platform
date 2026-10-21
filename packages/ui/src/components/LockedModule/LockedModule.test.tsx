import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderUi } from '../../test/render';
import { LockedModule } from './LockedModule';

afterEach(cleanup);

const base = {
  moduleName: 'Condition Monitoring',
  description: 'Aktueller Zustand von Pumpen, Servos und Verschleißteilen',
  onOpenCatalog: () => undefined,
};

describe('LockedModule', () => {
  it('zeigt Titel und Beschreibung aus dem Manifest', async () => {
    await renderUi(<LockedModule {...base} onActivate={() => undefined} />);
    expect(
      screen.getByRole('heading', {
        name: '„Condition Monitoring“ ist für diese Linie nicht gebucht',
      }),
    ).toBeDefined();
    expect(
      screen.getByText(/^Aktueller Zustand von Pumpen, Servos und Verschleißteilen\. Das Modul/),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Modul aktivieren' })).toBeDefined();
  });

  it('ohne Admin-Recht kein Aktivieren-Button', async () => {
    await renderUi(<LockedModule {...base} />);
    expect(screen.queryByRole('button', { name: 'Modul aktivieren' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Zum Baukasten' })).toBeDefined();
  });
});
