import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { MachineCard } from './MachineCard';

afterEach(cleanup);

const base = { name: 'Waschmaschine', state: 'Execute', rate: '312', oee: '86,3' } as const;

describe('MachineCard', () => {
  it('zeigt Fremdmaschine mit Integrationsstufe', async () => {
    await renderUi(<MachineCard {...base} kind="foreign" levelLabel="Standard" />);
    expect(screen.getByText('Fremd · Standard')).toBeDefined();
  });

  it('zeigt den Engpass und meldet die Auswahl', async () => {
    const onSelect = vi.fn();
    await renderUi(<MachineCard {...base} kind="own" bottleneck selected onSelect={onSelect} />);
    expect(screen.getByText('Engpass')).toBeDefined();
    const card = screen.getByRole('button');
    expect(card.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('ist auf Englisch beschriftet', async () => {
    await renderUi(<MachineCard {...base} kind="own" bottleneck />, 'en');
    expect(screen.getByText('Own machine')).toBeDefined();
    expect(screen.getByText('Bottleneck')).toBeDefined();
  });
});
