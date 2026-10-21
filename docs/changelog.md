# Changelog

Für alle im Projekt: Was mit jedem Meilenstein fertig wurde, mit kurzer Demo-Notiz.

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
