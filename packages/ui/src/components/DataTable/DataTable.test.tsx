import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DataTable } from './DataTable';

afterEach(cleanup);

describe('DataTable', () => {
  it('rendert Kopf, Zeilen und einen benannten Scrollbereich', () => {
    render(
      <DataTable
        label="Audit Trail"
        columns={[
          { key: 'time', header: 'Zeit', cell: (r: { time: string; user: string }) => r.time },
          { key: 'user', header: 'Benutzer', cell: (r) => r.user },
        ]}
        rows={[{ time: '14:20', user: '[QA]' }]}
        rowKey={(r) => r.time}
      />,
    );
    expect(screen.getByRole('region', { name: 'Audit Trail' }).tabIndex).toBe(0);
    expect(screen.getByRole('columnheader', { name: 'Zeit' })).toBeDefined();
    expect(screen.getByRole('cell', { name: '[QA]' })).toBeDefined();
  });
});
