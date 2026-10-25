import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { ScanInput, scanSource } from './ScanInput';

afterEach(cleanup);

describe('scanSource', () => {
  it('erkennt den Handscanner am schnellen Tippen', () => {
    expect(scanSource([0, 10, 20, 30, 40, 50, 60])).toBe('scanner');
    expect(scanSource([0, 180, 400, 610, 800])).toBe('manual');
    expect(scanSource([0, 5])).toBe('manual');
  });
});

describe('ScanInput', () => {
  it('meldet den Code mit Enter und leert das Feld', async () => {
    const onScan = vi.fn();
    await renderUi(<ScanInput label="Code am Formatteil" onScan={onScan} />);
    const input = screen.getByLabelText<HTMLInputElement>('Code am Formatteil');
    fireEvent.change(input, { target: { value: ' FT-3320 ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onScan).toHaveBeenCalledWith('FT-3320', 'manual');
    expect(input.value).toBe('');
  });

  it('zeigt einen Fehler als Meldung an', async () => {
    await renderUi(
      <ScanInput
        label="Code"
        onScan={() => undefined}
        status={{ tone: 'error', message: 'passt nicht' }}
      />,
    );
    expect(screen.getByRole('alert').textContent).toBe('passt nicht');
  });
});
