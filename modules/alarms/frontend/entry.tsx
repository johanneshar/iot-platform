import { defineModuleEntry } from '@iot/module-sdk';
import de from './locales/de.json';
import en from './locales/en.json';
import { AlarmsPage } from './pages/AlarmsPage';

/** Einstiegsmodul von Alarm-Analytics (ADR-002). */
export default defineModuleEntry({
  pages: { '': AlarmsPage },
  // Zähler in der Navigation: anstehende Alarme der Linie
  badge: (line) => {
    const count = line?.machines.reduce((sum, m) => sum + m.alarms.length, 0) ?? 0;
    return count > 0 ? count : null;
  },
  translations: { de, en },
});
