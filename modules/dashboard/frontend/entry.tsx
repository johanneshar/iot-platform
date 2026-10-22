import { defineModuleEntry } from '@iot/module-sdk';
import de from './locales/de.json';
import en from './locales/en.json';
import { OverviewPage } from './pages/OverviewPage';

/** Einstiegsmodul: die Shell lädt es per import() und rendert die Seite zum aufgerufenen Pfad (ADR-002). */
export default defineModuleEntry({
  pages: { '': OverviewPage },
  translations: { de, en },
});
