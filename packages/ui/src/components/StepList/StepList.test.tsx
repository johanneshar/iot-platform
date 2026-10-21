import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderUi } from '../../test/render';
import { StepList } from './StepList';

afterEach(cleanup);

describe('StepList', () => {
  it('markiert den aktuellen Schritt und erledigte Schritte', async () => {
    await renderUi(
      <StepList
        label="Batch-Verlauf"
        steps={[
          { id: 'a', label: 'Rüsten', status: 'done' },
          { id: 'b', label: 'Produktion', status: 'current' },
          { id: 'c', label: 'Bericht', status: 'upcoming' },
        ]}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items[1]?.getAttribute('aria-current')).toBe('step');
    expect(items[0]?.textContent).toContain('erledigt');
    expect(items[2]?.textContent).toContain('3');
  });
});
