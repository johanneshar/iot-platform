# Entwicklungsumgebung

Für Entwicklerinnen und Entwickler: Nach dieser Anleitung läuft die Plattform lokal – ohne Maschine und
ohne Edge Device.

## Voraussetzungen

- Node.js 22 LTS (Version steht in `.nvmrc`)
- pnpm 12 (Version steht in `package.json` unter `packageManager`; `corepack enable` richtet sie ein)
- Docker Desktop (für den lokalen MQTT-Broker)
- VS Code, empfohlen mit der Erweiterung „Dev Containers“

## Variante A: lokal

1. **Repository klonen und Abhängigkeiten installieren**

   ```bash
   pnpm install
   ```

   _Ergebnis:_ Die Installation endet mit `Done`. Die git-Hooks für Commit-Nachricht und Formatierung sind
   eingerichtet.

2. **Plattform starten**

   ```bash
   pnpm dev
   ```

   _Ergebnis:_ Der MQTT-Broker läuft auf Port 1883, die Shell unter <http://localhost:5180>, das
   Core-Backend unter <http://localhost:4000/api/health>. Läuft Docker nicht, erscheint ein Hinweis und
   Shell und Backend starten trotzdem.

3. **Doku starten** (in einem zweiten Terminal)

   ```bash
   pnpm docs
   ```

   _Ergebnis:_ Diese Doku ist unter <http://localhost:5181> erreichbar.

4. **Prüfen, ob alles grün ist**

   ```bash
   pnpm lint && pnpm typecheck && pnpm test
   ```

   _Ergebnis:_ Alle Aufgaben enden ohne Fehler.

## Variante B: Dev-Container

1. Ordner in VS Code öffnen und **„Reopen in Container“** wählen.
   _Ergebnis:_ Der Container wird gebaut, `pnpm install` läuft automatisch.
2. Im Terminal des Containers `pnpm dev` ausführen.
   _Ergebnis:_ wie in Variante A; die Ports werden an den Rechner weitergeleitet.

## Ports

| Port | Dienst                                   |
| ---- | ---------------------------------------- |
| 1883 | MQTT-Broker (Mosquitto, nur Entwicklung) |
| 4000 | Core-Backend                             |
| 5180 | Shell (Core-Frontend)                    |
| 5181 | Doku                                     |

## Weitere Befehle

| Befehl                 | Zweck                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| `pnpm build`           | Produktions-Build aller Pakete                                                                              |
| `pnpm test:e2e`        | E2E- und Barrierefreiheitstests (Playwright + axe); einmalig vorher `pnpm exec playwright install chromium` |
| `pnpm format`          | Code formatieren                                                                                            |
| `pnpm dev:broker:stop` | MQTT-Broker beenden                                                                                         |

## Commits

Commit-Nachrichten folgen [Conventional Commits](https://www.conventionalcommits.org/de/), z. B.
`feat(alarms): Filter nach Klasse`. Der git-Hook lehnt andere Formate ab.
