import { SUPPORTED_LANGUAGES, isSupportedLanguage, useTranslation } from '@iot/module-sdk';
import { useId } from 'react';
import { CORE_NAMESPACE, storeLanguage } from '../i18n';

/**
 * Sprachumschaltung der Shell. Vorläufig ein natives Auswahlfeld; die gestaltete
 * Fassung entsteht mit M1 in @iot/ui.
 */
export function LanguageSwitch() {
  const { t, i18n } = useTranslation(CORE_NAMESPACE);
  const id = useId();

  return (
    <div>
      <label htmlFor={id}>{t('language.label')}</label>{' '}
      <select
        id={id}
        value={i18n.resolvedLanguage}
        onChange={(event) => {
          const code = event.target.value;
          if (!isSupportedLanguage(code)) return;
          storeLanguage(code);
          void i18n.changeLanguage(code);
        }}
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <option key={language.code} value={language.code} lang={language.code}>
            {language.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
