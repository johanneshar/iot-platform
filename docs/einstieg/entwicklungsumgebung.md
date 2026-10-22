# Entwicklungsumgebung

Für Entwicklerinnen und Entwickler: Nach dieser Anleitung läuft die Plattform lokal – ohne Maschine und
ohne Edge Device.

## Voraussetzungen

- Node.js 22 LTS (Version steht in `.nvmrc`)
- pnpm 12 (Version steht in `package.json` unter `packageManager`; `corepack enable` richtet sie ein)
- Docker Desktop – nur für `pnpm dev:mosquitto`; `pnpm dev` braucht kein Docker
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

   _Ergebnis:_ MQTT-Broker (im Prozess, Port 1883), Simulator, Core und alle Module laufen. Die Shell steht
   unter <http://localhost:5180> – anmelden z. B. als `operator` mit `entwicklung`.

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

## Anmelden in der Entwicklung

Beim ersten Start legt der Core je Rolle einen Beispielbenutzer an, alle mit dem Passwort `entwicklung`
(änderbar über `CORE_DEV_PASSWORD`). Im Betrieb gibt es diese Benutzer nicht.

| Benutzer      | Rolle                 |
| ------------- | --------------------- |
| `operator`    | Operator              |
| `maintenance` | Maintenance           |
| `setup`       | Setup Man             |
| `qa`          | QA                    |
| `admin`       | Admin                 |
| `itadmin`     | IT Admin              |
| `service`     | Service (alle Rechte) |

Neu anfangen: `apps/core/backend/.data/` löschen – Datenbank, Benutzer und Audit Trail entstehen neu.

## Ports

| Port                  | Dienst                                       |
| --------------------- | -------------------------------------------- |
| 1883                  | MQTT-Broker (Mosquitto, nur Entwicklung)     |
| 4000                  | Core-Backend                                 |
| 5180                  | Shell (Core-Frontend)                        |
| 5181                  | Doku                                         |
| 5182                  | Storybook                                    |
| 4100                  | Beispielmodul (`tooling/example`)            |
| 4001, 5190            | zweite Linie mit `pnpm dev:line2`            |
| 4002, 5195, 4201–4203 | dritte Linie (Flexfill) mit `pnpm dev:line3` |
| 4101, 4102, 4103      | Module Dashboard, Alarme, Fehlersuche        |
| 4010, 4110, 5185      | E2E-Tests (`pnpm test:e2e`)                  |

## Weitere Befehle

| Befehl                                           | Zweck                                                                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `pnpm build`                                     | Produktions-Build aller Pakete                                                                              |
| `pnpm test:e2e`                                  | E2E- und Barrierefreiheitstests (Playwright + axe); einmalig vorher `pnpm exec playwright install chromium` |
| `pnpm format`                                    | Code formatieren                                                                                            |
| `pnpm dev:mosquitto`                             | wie `pnpm dev`, aber mit Mosquitto in Docker                                                                |
| `pnpm dev:broker:stop`                           | MQTT-Broker beenden                                                                                         |
| `pnpm dev:line2`                                 | zweite Linie „Linie 2 · Spritzen“ mit eigenem Core starten (Linienwahl testen)                              |
| `pnpm dev:line3`                                 | dritte Linie „Linie 3 · Flexfill“ mit eigenem Core und Modulen (3D-Ansicht)                                 |
| `pnpm create-module <id> "<Name>" --port <port>` | neues Modul aus der Vorlage ([Anleitung](/anleitungen/neues-modul))                                         |

## Commits

Commit-Nachrichten folgen [Conventional Commits](https://www.conventionalcommits.org/de/), z. B.
`feat(alarms): Filter nach Klasse`. Der git-Hook lehnt andere Formate ab.
