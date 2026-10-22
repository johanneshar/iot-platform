# IoT-Plattform

Modulare IoT-Plattform für Pharma-Abfülllinien auf Siemens Industrial Edge. Einstieg für das Projekt ist
[CLAUDE.md](CLAUDE.md), die ausführliche Dokumentation liegt in [docs/](docs/).

## Schnellstart

Voraussetzungen: Node.js 22, pnpm 12 (`corepack enable`). Docker ist nicht nötig.

```bash
pnpm install
pnpm dev     # Broker, Simulator, Core, Module – Shell http://localhost:5180 (Benutzer operator, Passwort entwicklung)
pnpm docs    # Dokumentation (http://localhost:5181)
```

## Weitere Befehle

| Befehl                                       | Zweck                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------- |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Qualitätsprüfungen                                                                      |
| `pnpm test:e2e`                              | E2E- und Barrierefreiheitstests (vorher einmal `pnpm exec playwright install chromium`) |
| `pnpm build`                                 | Produktions-Build                                                                       |
| `pnpm format`                                | Formatieren                                                                             |

Details: [docs/einstieg/entwicklungsumgebung.md](docs/einstieg/entwicklungsumgebung.md)
