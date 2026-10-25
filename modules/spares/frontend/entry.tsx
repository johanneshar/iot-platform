import { defineModuleEntry } from '@iot/module-sdk';
import de from './locales/de.json';
import en from './locales/en.json';
import { SparesPage } from './pages/SparesPage';
import { requestList } from './request-list';

/** Einstiegsmodul des Ersatzteilkatalogs (ADR-002). */
export default defineModuleEntry({
  pages: { '': SparesPage },
  // Zähler in der Navigation: Teile in der Anfrageliste (Mockup)
  badge: () => {
    const count = requestList.get().length;
    return count > 0 ? count : null;
  },
  translations: { de, en },
});
