import { defineModuleEntry } from '@iot/module-sdk';
import de from './locales/de.json';
import en from './locales/en.json';
import { BatchPage } from './pages/BatchPage';

/** Einstiegsmodul des Batch-Reportings (ADR-002). */
export default defineModuleEntry({
  pages: { '': BatchPage },
  translations: { de, en },
});
