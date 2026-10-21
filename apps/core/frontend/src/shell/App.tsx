import { useTranslation } from '@iot/module-sdk';
import { useEffect } from 'react';
import { CORE_NAMESPACE } from '../i18n';
import { LanguageSwitch } from './LanguageSwitch';

/**
 * Leere Shell aus M0: nur die Landmarken des späteren Layouts (Seitenleiste, Header,
 * Inhaltsbereich). Navigation entsteht ab M3 ausschließlich aus Modul-Manifesten.
 */
export function App() {
  const { t, i18n } = useTranslation(CORE_NAMESPACE);

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? i18n.language;
    document.title = t('app.title');
  }, [i18n.resolvedLanguage, i18n.language, t]);

  return (
    <>
      <nav aria-label={t('app.navigation')} />
      <header>
        <h1>{t('app.title')}</h1>
        <LanguageSwitch />
      </header>
      <main>
        <p>{t('app.noModules')}</p>
        <p>{t('app.noModulesHint')}</p>
      </main>
    </>
  );
}
