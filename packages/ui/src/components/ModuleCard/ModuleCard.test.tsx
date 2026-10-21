import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderUi } from '../../test/render';
import { ModuleCard } from './ModuleCard';

afterEach(cleanup);

const base = { name: 'Batch-Reporting', description: 'Batchdaten', categoryLabel: 'Produktion' };

describe('ModuleCard', () => {
  it('Kernmodul ist immer enthalten und hat keinen Schalter', async () => {
    await renderUi(<ModuleCard {...base} core booked />);
    expect(screen.getByText('Immer enthalten')).toBeDefined();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('gebuchtes Modul zeigt Abbestellen und Öffnen', async () => {
    await renderUi(<ModuleCard {...base} booked onOpen={() => undefined} />);
    expect(
      screen.getByRole('button', { name: 'Aktiv – deaktivieren' }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByRole('button', { name: 'Öffnen' })).toBeDefined();
  });

  it('ohne Admin-Recht ist der Schalter gesperrt', async () => {
    await renderUi(<ModuleCard {...base} booked={false} canToggle={false} />);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Modul buchen' }).disabled).toBe(
      true,
    );
  });
});
