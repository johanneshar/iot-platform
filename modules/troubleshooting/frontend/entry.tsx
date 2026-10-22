import { defineModuleEntry } from '@iot/module-sdk';
import de from './locales/de.json';
import en from './locales/en.json';
import { TroubleshootingPage } from './pages/TroubleshootingPage';

/** Einstiegsmodul der geführten Fehlersuche (ADR-002). */
export default defineModuleEntry({
  pages: { '': TroubleshootingPage },
  translations: { de, en },
});
