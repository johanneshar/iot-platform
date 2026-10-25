import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'de-DE',
  title: 'IoT-Plattform',
  description: 'Entwickler-, Anwender- und Schulungsdokumentation der modularen IoT-Plattform',
  cleanUrls: true,
  lastUpdated: true,
  // Lokale Dev-Adressen sind beim Build nicht erreichbar; alle anderen Links werden geprüft.
  ignoreDeadLinks: 'localhostLinks',
  themeConfig: {
    nav: [
      { text: 'Einstieg', link: '/einstieg/ueberblick' },
      { text: 'Architektur', link: '/architektur/uebersicht' },
      { text: 'Module', link: '/module/uebersicht' },
      { text: 'Anleitungen', link: '/anleitungen/neues-modul' },
      { text: 'Schulung', link: '/schulung/entwickler-tag-1' },
    ],
    sidebar: [
      {
        text: 'Einstieg',
        items: [
          { text: 'Überblick', link: '/einstieg/ueberblick' },
          { text: 'Entwicklungsumgebung', link: '/einstieg/entwicklungsumgebung' },
          { text: 'Glossar', link: '/einstieg/glossar' },
        ],
      },
      {
        text: 'Architektur',
        items: [
          { text: 'Übersicht', link: '/architektur/uebersicht' },
          { text: 'Schnittstelle Maschinendaten', link: '/architektur/schnittstelle' },
          { text: 'GxP', link: '/architektur/gxp' },
          { text: 'Rollen und Rechte', link: '/architektur/rollen-rechte' },
          { text: 'Design-System', link: '/architektur/design-system' },
        ],
      },
      {
        text: 'Entscheidungen (ADR)',
        items: [
          { text: 'Übersicht', link: '/adr/' },
          { text: 'ADR-000 Vorlage', link: '/adr/ADR-000-vorlage' },
          { text: 'ADR-001 Tech-Stack', link: '/adr/ADR-001-tech-stack' },
          { text: 'ADR-002 Einbindung der Modul-UIs', link: '/adr/ADR-002-modul-einbindung' },
          { text: 'ADR-003 Schnittstelle 0.2', link: '/adr/ADR-003-schnittstelle-v0-2' },
          {
            text: 'ADR-004 Anmeldung, Audit, Signatur',
            link: '/adr/ADR-004-anmeldung-audit-signatur',
          },
          { text: 'ADR-005 Datenzugriff', link: '/adr/ADR-005-datenzugriff' },
          { text: 'ADR-006 Datenquelle', link: '/adr/ADR-006-identity-source' },
          { text: 'ADR-007 Fehlerbäume', link: '/adr/ADR-007-fehlerbaum-format' },
          { text: 'ADR-008 Proxy und Einsprungpunkte', link: '/adr/ADR-008-modul-backends-proxy' },
          { text: 'ADR-009 Verlauf im Dashboard', link: '/adr/ADR-009-verlauf-dashboard' },
          { text: 'ADR-010 3D-Ansicht', link: '/adr/ADR-010-3d-ansicht' },
          { text: 'ADR-011 Batchbericht', link: '/adr/ADR-011-batchbericht' },
          { text: 'ADR-012 Alarme und Batch retained', link: '/adr/ADR-012-retained-alarme-batch' },
          {
            text: 'ADR-013 Formatwechsel und Ersatzteile',
            link: '/adr/ADR-013-formatwechsel-ersatzteile',
          },
        ],
      },
      {
        text: 'Module',
        items: [
          { text: 'Übersicht', link: '/module/uebersicht' },
          { text: 'Linien-Dashboard', link: '/module/dashboard' },
          { text: 'Alarm-Analytics', link: '/module/alarms' },
          { text: 'Geführte Fehlersuche', link: '/module/troubleshooting' },
          { text: 'Batch-Reporting', link: '/module/batch' },
          { text: 'Geführter Formatwechsel', link: '/module/format' },
          { text: 'Ersatzteilkatalog', link: '/module/spares' },
        ],
      },
      {
        text: 'Anleitungen',
        items: [
          { text: 'Neues Modul', link: '/anleitungen/neues-modul' },
          { text: 'Neue Komponente', link: '/anleitungen/neue-komponente' },
          { text: 'Simulator nutzen', link: '/anleitungen/simulator' },
          { text: 'Maschine anbinden', link: '/anleitungen/maschine-anbinden' },
          { text: '3D-Modell einbinden', link: '/anleitungen/3d-modell' },
          { text: 'Deployment auf Edge', link: '/anleitungen/deployment-edge' },
        ],
      },
      {
        text: 'Schulung',
        items: [
          { text: 'Entwickler – Tag 1', link: '/schulung/entwickler-tag-1' },
          { text: 'Anwender', link: '/schulung/anwender' },
          { text: 'Service', link: '/schulung/service' },
        ],
      },
      {
        text: 'Referenz',
        items: [
          { text: 'Konzept', link: '/referenz/konzept' },
          { text: 'Schnittstellenspezifikation', link: '/referenz/schnittstellenspezifikation' },
        ],
      },
      {
        text: 'Projekt',
        items: [
          { text: 'Offene Punkte', link: '/offene-punkte' },
          { text: 'Changelog', link: '/changelog' },
        ],
      },
    ],
    outline: { label: 'Auf dieser Seite', level: [2, 3] },
    docFooter: { prev: 'Zurück', next: 'Weiter' },
    lastUpdated: { text: 'Zuletzt geändert' },
    search: { provider: 'local' },
  },
});
