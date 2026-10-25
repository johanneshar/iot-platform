import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { PartCard } from './PartCard';

afterEach(cleanup);

const base = {
  id: 'ET-10233',
  name: 'Pumpenkopf Dosierpumpe',
  group: 'Dosierung',
  leadTime: '3 Tage',
};

describe('PartCard', () => {
  it('zeigt Bestand und Lieferzeit', async () => {
    await renderUi(<PartCard {...base} stock={2} />);
    expect(screen.getByText('2 vor Ort')).toBeDefined();
    expect(screen.getByText('Lieferzeit 3 Tage')).toBeDefined();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('ohne Bestand: nicht vorrätig', async () => {
    await renderUi(<PartCard {...base} stock={0} />, 'en');
    expect(screen.getByText('Out of stock')).toBeDefined();
  });

  it('schaltet die Anfrage um', async () => {
    const onToggle = vi.fn();
    await renderUi(<PartCard {...base} stock={2} inRequest onToggle={onToggle} />);
    const button = screen.getByRole('button', { name: '✓ In der Anfrageliste' });
    expect(button.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
