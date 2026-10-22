import { defineModuleEntry } from '@iot/module-sdk';
import de from './locales/de.json';
import en from './locales/en.json';
import { HomePage } from './pages/HomePage';

/** Einstiegsmodul: die Shell lädt es per import() und rendert die Seite zum aufgerufenen Pfad (ADR-002). */
export default defineModuleEntry({
  pages: { '': HomePage },
  translations: { de, en },
});
