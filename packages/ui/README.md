# @iot/ui

Für Modulentwickler: die gemeinsame Komponentenbibliothek nach dem UI-Mockup (CLAUDE.md, Abschnitt 7.4).

```bash
pnpm storybook          # http://localhost:5182
pnpm storybook:build    # statisch nach storybook-static/ (Grundlage der axe-Prüfung)
```

- Stile nur mit Tokens aus `@iot/design-tokens`; globale Grundstile: `import '@iot/ui/styles.css'`
- Feste Texte im i18n-Namespace `ui` (`src/i18n/de.json`, `en.json`); die Shell registriert `uiTranslations`
- Übersicht aller Komponenten und bewusste Abweichungen vom Mockup: `docs/architektur/design-system.md`
- Neue Komponente: `docs/anleitungen/neue-komponente.md`
