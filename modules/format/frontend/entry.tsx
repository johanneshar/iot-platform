import { defineModuleEntry } from '@iot/module-sdk';
import de from './locales/de.json';
import en from './locales/en.json';
import { FormatPage } from './pages/FormatPage';

/** Einstiegsmodul des geführten Formatwechsels (ADR-002). */
export default defineModuleEntry({
  pages: { '': FormatPage },
  translations: { de, en },
});
