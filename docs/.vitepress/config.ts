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
        ],
      },
      {
        text: 'Entscheidungen (ADR)',
        items: [
          { text: 'Übersicht', link: '/adr/' },
          { text: 'ADR-000 Vorlage', link: '/adr/ADR-000-vorlage' },
          { text: 'ADR-001 Tech-Stack', link: '/adr/ADR-001-tech-stack' },
          { text: 'ADR-002 Einbindung der Modul-UIs', link: '/adr/ADR-002-modul-einbindung' },
        ],
      },
      {
        text: 'Module',
        items: [{ text: 'Übersicht', link: '/module/uebersicht' }],
      },
      {
        text: 'Anleitungen',
        items: [
          { text: 'Neues Modul', link: '/anleitungen/neues-modul' },
          { text: 'Neue Komponente', link: '/anleitungen/neue-komponente' },
          { text: 'Maschine anbinden', link: '/anleitungen/maschine-anbinden' },
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
