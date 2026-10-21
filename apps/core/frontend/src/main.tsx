import { I18nProvider } from '@iot/module-sdk';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createCoreI18n } from './i18n';
import { App } from './shell/App';

const container = document.getElementById('root');
if (!container) throw new Error('Element #root fehlt in index.html');

const i18n = await createCoreI18n();

createRoot(container).render(
  <StrictMode>
    <I18nProvider i18n={i18n}>
      <App />
    </I18nProvider>
  </StrictMode>,
);
