import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useUiTranslation } from '../../i18n/translations';
import { Button } from '../Button/Button';
import styles from './SignatureDialog.module.css';

export interface SignatureDialogProps {
  open: boolean;
  /** Bedeutung der Signatur, z. B. „Freigabe“ (E-13) */
  meaning: string;
  /** Was signiert wird, z. B. „Batchbericht B-2026-1042“ */
  subject?: string;
  error?: string | null;
  busy?: boolean;
  onSign: (credentials: { username: string; password: string }) => void;
  onCancel: () => void;
}

/**
 * Elektronische Signatur nach 21 CFR Part 11: erneute Eingabe von Benutzer und Passwort, Bedeutung sichtbar.
 * Modaler Dialog (`<dialog>`): Fokus bleibt im Dialog, Escape bricht ab.
 */
export function SignatureDialog({ open, onCancel, ...form }: SignatureDialogProps) {
  const t = useUiTranslation();
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id={`${id}-title`} className={styles.title}>
        {t('signature.title')}
      </h2>
      {/* Das Formular existiert nur bei offenem Dialog – Zugangsdaten bleiben nie über einen Vorgang hinaus */}
      {open && <SignatureForm id={id} onCancel={onCancel} {...form} />}
    </dialog>
  );
}

type FormProps = Omit<SignatureDialogProps, 'open'> & { id: string };

function SignatureForm({ id, meaning, subject, error, busy = false, onSign, onCancel }: FormProps) {
  const t = useUiTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSign({ username: username.trim(), password });
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      {subject && <div className={styles.subject}>{subject}</div>}
      <div className={styles.meaning}>
        <span className={styles.meaningLabel}>{t('signature.meaning')}</span>
        <span className={styles.meaningValue}>{meaning}</span>
      </div>
      <p className={styles.hint}>{t('signature.hint')}</p>
      <div className={styles.field}>
        <label htmlFor={`${id}-user`} className={styles.label}>
          {t('signature.username')}
        </label>
        <input
          id={`${id}-user`}
          className={styles.input}
          autoComplete="username"
          autoCapitalize="none"
          required
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
          }}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor={`${id}-password`} className={styles.label}>
          {t('signature.password')}
        </label>
        <input
          id={`${id}-password`}
          className={styles.input}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
        />
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit" disabled={busy}>
          {busy ? t('signature.busy') : t('signature.sign')}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          {t('signature.cancel')}
        </Button>
      </div>
    </form>
  );
}
