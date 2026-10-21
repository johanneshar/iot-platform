# ADR-001: Tech-Stack

Status: angenommen
Datum: 2026-10-21

## Kontext

Die Plattform besteht aus Core, Normalizer und vielen eigenständigen Modulen. Jedes Modul ist eine Edge App
(Docker) mit eigener Oberfläche und eigenem Backend. Frontend, Backend und Schnittstellen-Schemas sollen
dasselbe Typensystem teilen. Das Mockup muss exakt umgesetzt werden.

## Entscheidung

| Bereich          | Wahl                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| Sprache          | TypeScript (strict, kein `any`) für Frontend, Backend und Werkzeuge                                         |
| Laufzeit         | Node.js 22 LTS                                                                                              |
| Frontend         | React 18 + Vite                                                                                             |
| Styling          | CSS-Variablen (Design Tokens) + CSS Modules                                                                 |
| Komponenten-Doku | Storybook (ab M1)                                                                                           |
| Backend je Modul | Fastify                                                                                                     |
| Datenzugriff     | MQTT (Databus), optional IIH per REST/GraphQL                                                               |
| Persistenz       | SQLite je Modul, Audit Trail zentral im Core                                                                |
| Schemas          | JSON Schema → generierte TS-Typen                                                                           |
| i18n             | i18next + react-i18next, ein Namespace je Paket, Rückfall auf Deutsch                                       |
| Monorepo         | pnpm Workspaces + Turborepo                                                                                 |
| Qualität         | ESLint (typescript-eslint strict, React, jsx-a11y, i18n-Literalprüfung), Prettier, commitlint über lefthook |
| Tests            | Vitest (Unit), Playwright (E2E), axe (Barrierefreiheit)                                                     |
| Doku             | VitePress aus `docs/`                                                                                       |
| CI               | GitHub Actions, SBOM nach CycloneDX, Dependabot                                                             |
| Container        | Docker, docker compose; Edge-Paketierung mit App Publisher bzw. `iectl`                                     |

Für die Lieferkette gilt: Versionen werden fest angegeben, und pnpm installiert nur Pakete, die eine
Mindestzeit veröffentlicht sind. Build-Skripte von Abhängigkeiten laufen nur nach Freigabe in
`pnpm-workspace.yaml` (`allowBuilds`).

## Alternativen

- **.NET für Backends** (wie bei der HMI-Middleware): zwei Typensysteme, Schematypen doppelt pflegen.
  Verworfen.
- **Tailwind oder ein UI-Framework:** erschwert die pixelgenaue Umsetzung des Mockups. Verworfen.
- **ESLint 10:** die React- und a11y-Plugins unterstützen es noch nicht; wir bleiben vorerst bei ESLint 9.

## Konsequenzen

- Ein Team kann Frontend und Backend aller Module pflegen.
- Gemeinsame Typen aus `interface-schema` und `module-sdk` gelten überall.
- Node.js-Abhängigkeiten müssen über SBOM und Dependabot aktiv gepflegt werden (CRA).
