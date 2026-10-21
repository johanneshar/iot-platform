# Changelog

Für alle im Projekt: Was mit jedem Meilenstein fertig wurde, mit kurzer Demo-Notiz.

## M1 – Design Tokens und @iot/ui (2026-10-21)

**Neu**

- `@iot/design-tokens`: alle Werte des Mockups als Tokens in `tokens.ts`, daraus erzeugt `tokens.css`
- `@iot/ui`: 23 Komponenten aus CLAUDE.md 7.4 plus `InfoTile`, `ChoiceButton`, `UserBadge`,
  `SidebarStatus`, `StepTrail`, `Stack`, `Icon`; feste Texte auf Deutsch und Englisch
- Storybook (`pnpm storybook`, Port 5182) mit 78 Stories, Sprachumschaltung und a11y-Addon
- Gesamtansichten „Linienübersicht“ und „Sperrbildschirm“ zum Abgleich mit dem Mockup
- Beispieldaten des Mockups in `packages/simulator/fixtures/mockup.ts`
- Stylelint erzwingt Tokens: keine Hex-Farben, keine Pixelwerte im CSS
- axe-Prüfung jeder Story in Deutsch und Englisch (Playwright, auch in der CI)
- Doku: [Design-System](/architektur/design-system), [Neue Komponente](/anleitungen/neue-komponente)

**Abweichungen vom Mockup** (zur Bestätigung, O-13): volle Deckkraft der Haupt-KPI-Texte und dunkler Zähler
im aktiven Navigationseintrag wegen Kontrast; sichtbarer Fokus.

**Demo**

1. `pnpm storybook` → <http://localhost:5182>
2. „Ansichten › Mockup-Abgleich › Linienübersicht“ öffnen und neben das Mockup legen; Maschinen anklicken.
3. In der Werkzeugleiste „Sprache“ auf English stellen → feste Texte der Komponenten wechseln.

## M0 – Gerüst (2026-10-21)

**Neu**

- Monorepo mit pnpm Workspaces und Turborepo, TypeScript strict, ESLint, Prettier
- Conventional Commits über commitlint und lefthook
- Leere Shell (`apps/core/frontend`) mit Sprachumschaltung Deutsch/Englisch
- Core-Backend (`apps/core/backend`) mit `/api/health`
- i18n-Grundgerüst im `module-sdk`
- Paketgerüste für Design Tokens, UI, Schnittstellen-Schema, Simulator, Konformitätsprüfer, Normalizer
- Lokaler MQTT-Broker (Mosquitto) per docker compose, Dev-Container
- CI mit GitHub Actions: Format, Lint, Typecheck, Unit-Tests, Build, Doku-Build, E2E mit axe, SBOM
- Doku-Gerüst mit VitePress, ADR-001 (Tech-Stack), ADR-002 (Modul-Einbindung, vorgeschlagen)

**Demo**

1. `pnpm install && pnpm dev` → Shell unter <http://localhost:5180> zeigt „Noch keine Module registriert.“
2. Sprache auf „English“ stellen → Titel wechselt auf „IoT Platform“; die Wahl bleibt nach dem Neuladen erhalten.
3. `pnpm docs` → Doku unter <http://localhost:5181>.
