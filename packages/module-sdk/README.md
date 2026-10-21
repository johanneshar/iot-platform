# @iot/module-sdk

Für Modulentwickler: Alles, was ein Modul vom System braucht, kommt aus diesem Paket (CLAUDE.md, Abschnitt 6.2).

Stand M0: i18n-Grundgerüst (`createI18n`, `SUPPORTED_LANGUAGES`, `useTranslation`).
Manifest-Typen, Hooks für Maschinendaten, Navigation, Audit und Lizenz folgen in M3.

## Übersetzungen

Jedes Paket bringt einen eigenen Namespace mit, z. B. `core` oder `alarms`, und je Sprache eine Datei
`locales/<code>.json`. Fehlt ein Schlüssel, zeigt die Oberfläche den deutschen Text.
Eine weitere Sprache wird in `src/i18n/languages.ts` eingetragen.
