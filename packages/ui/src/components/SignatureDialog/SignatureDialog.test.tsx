import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { SignatureDialog } from './SignatureDialog';

// jsdom kennt showModal/close nicht vollständig
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
});

afterEach(cleanup);

const props = { meaning: 'Freigabe', subject: 'Batchbericht B-2026-1042', onCancel: vi.fn() };

describe('SignatureDialog', () => {
  it('zeigt die Bedeutung und verlangt Benutzer und Passwort', async () => {
    const onSign = vi.fn();
    await renderUi(<SignatureDialog open {...props} onSign={onSign} />);
    expect(screen.getByRole('dialog', { name: 'Elektronische Signatur' })).toBeDefined();
    expect(screen.getByText('Freigabe')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Benutzer'), { target: { value: 'qa' } });
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'geheim' } });
    fireEvent.click(screen.getByRole('button', { name: 'Signieren' }));
    expect(onSign).toHaveBeenCalledWith({ username: 'qa', password: 'geheim' });
  });

  it('Escape bricht ab', async () => {
    const onCancel = vi.fn();
    await renderUi(<SignatureDialog open {...props} onCancel={onCancel} onSign={vi.fn()} />);
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('hat geschlossen keine Eingabefelder – Zugangsdaten bleiben nicht stehen', async () => {
    await renderUi(<SignatureDialog open={false} {...props} onSign={vi.fn()} />);
    expect(screen.queryByLabelText('Passwort')).toBeNull();
  });
});
