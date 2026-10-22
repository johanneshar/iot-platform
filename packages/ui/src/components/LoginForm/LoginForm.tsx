import { useId, useState, type FormEvent } from 'react';
import { Icon } from '../../icons/Icon';
import { useUiTranslation } from '../../i18n/translations';
import { Button } from '../Button/Button';
import styles from './LoginForm.module.css';

export interface LoginFormProps {
  /** Produktname, z. B. „IoT Plattform“ */
  productName: string;
  /** Zeile darunter, z. B. Linienname */
  subtitle?: string;
  /** Fehlermeldung der letzten Anmeldung */
  error?: string | null;
  busy?: boolean;
  onSubmit: (username: string, password: string) => void;
}

/** Anmeldung an der Plattform (nicht im Mockup; gestaltet aus den Tokens, M3b). */
export function LoginForm({
  productName,
  subtitle,
  error,
  busy = false,
  onSubmit,
}: LoginFormProps) {
  const t = useUiTranslation();
  const id = useId();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(username.trim(), password);
  };

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={submit} aria-labelledby={`${id}-title`}>
        <div className={styles.brand}>
          <div className={styles.mark}>
            <Icon name="brand" size="lg" className={styles.markIcon} />
          </div>
          <div>
            <div className={styles.product}>{productName}</div>
            {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
          </div>
        </div>
        <h1 id={`${id}-title`} className={styles.title}>
          {t('login.title')}
        </h1>
        <div className={styles.field}>
          <label htmlFor={`${id}-user`} className={styles.label}>
            {t('login.username')}
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
            {t('login.password')}
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
        <Button type="submit" fullWidth disabled={busy}>
          {busy ? t('login.busy') : t('login.submit')}
        </Button>
      </form>
    </main>
  );
}
