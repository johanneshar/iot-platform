# Geführter Formatwechsel – Entwicklerdoku

Für Entwicklerinnen und Entwickler: Aufbau, Datenfluss, Prüfungen und Signaturen des Formatwechsels
(GxP-relevant, Mindeststufe `basic`).

## Aufbau

| Datei                                  | Inhalt                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `manifest.ts`                          | ID `format`, Navigation Service (20) „Formatwechsel“, `gxp: true`, Rechte `format.*`      |
| `schemas/format-procedure.schema.json` | Format der Abläufe (ADR-013)                                                              |
| `shared/format.ts`                     | Typen, Vorgänge im Audit Trail (`ACTIONS`), Prüfung von Abläufen und Scans                |
| `backend/procedures.ts`                | Abläufe laden und prüfen (Schema + Aufbau)                                                |
| `backend/store.ts`                     | `FormatStore`: Abläufe (versioniert) und Wechsel in SQLite, Protokoll-Hash                |
| `backend/app.ts`                       | API hinter dem Proxy; prüft jeden Schritt am Audit Trail; aktuelles Format, Rezeptprüfung |
| `backend/main.ts`                      | Abo der Linie (Namen, Zustände, Batch-Rezepte), Anmeldung beim Core                       |
| `frontend/pages/FormatPage.tsx`        | Seite nach Mockup „Geführter Formatwechsel“                                               |

Entscheidungen: [ADR-013](../../../docs/adr/ADR-013-formatwechsel-ersatzteile.md), E-15, E-17, E-50, E-51.

## Datenfluss

Databus → `subscribeLine` → Namen (`identity.type`), Zustände (`state`) und Rezepte (`batch.recipe`) je
Maschine im Speicher; alle drei sind retained und nach einem Neustart sofort da. Abläufe kommen beim Start aus
`FORMAT_PROCEDURES_DIR` (Standard: `packages/simulator/fixtures/format-procedures/`) und über die Oberfläche.

## Ablauf und Prüfung

| Schritt            | Eintrag im Audit Trail                                                   | Backend prüft                                                   |
| ------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Wechsel beginnen   | `format.change-started`, Wert `<ablauf> v<n>`                            | `format.execute`, Ablauf passt zum aktuellen Format             |
| Schritt bestätigen | `format.step-confirmed`, Wert `<schritt>[: <teil> @ <platz> (<quelle>)]` | Reihenfolge, Codes, „Linie leerfahren“: alle `Stopped`          |
| Zurück             | `format.step-reverted`, Wert = letzter Schritt                           | `format.execute`                                                |
| Abbrechen          | `format.change-cancelled`                                                | `format.execute`                                                |
| Durchgeführt       | Signatur „Durchgeführt“, Wert = Protokoll-Hash                           | `format.sign`, alle Schritte bestätigt                          |
| Freigabe           | Signatur „Freigabe“, Wert = Protokoll-Hash                               | `format.release`, andere Person als „Durchgeführt“              |
| Ablauf einrichten  | `format.procedure-imported`, Wert `<ablauf> v<n>`                        | `format.configure`, Schema, Maschinen der Linie, neuere Version |

Alle Einträge tragen den Bezug `format:<FW-Nummer>` (Ablauf: `format:procedure:<id>`). Die Oberfläche schickt
nur die laufende Nummer (`seq`); das Backend liest den Eintrag mit Dienst-Token beim Core und vergleicht ihn.

## API (über `/api/modules/format/…`)

| Methode  | Pfad                   | Zweck                                                                   |
| -------- | ---------------------- | ----------------------------------------------------------------------- |
| GET      | `/state`               | aktuelles Format, Ziele, offener und letzter Wechsel, Zustand der Linie |
| POST     | `/changes`             | `{ procedureId }` – Wechsel beginnen                                    |
| POST     | `/changes/:id/steps`   | `{ stepId, scans, seq }`                                                |
| POST     | `/changes/:id/revert`  | `{ seq }`                                                               |
| POST     | `/changes/:id/cancel`  | `{ seq }`                                                               |
| POST     | `/changes/:id/perform` | `{ seq }` – Signatur „Durchgeführt“                                     |
| POST     | `/changes/:id/release` | `{ seq }` – Signatur „Freigabe“                                         |
| GET/POST | `/procedures`          | Abläufe lesen / `{ procedure, seq }` einrichten                         |

## Konfiguration

| Variable                | Standard                                         |
| ----------------------- | ------------------------------------------------ |
| `MODULE_PORT`           | 4105                                             |
| `FORMAT_PROCEDURES_DIR` | `packages/simulator/fixtures/format-procedures/` |
| `MODULE_DATA_DIR`       | `modules/format/.data/<linie>/`                  |

## Deep Links

Einsprung ohne Parameter: `navigate('format')` (Maschinen-Detailseite „Formatwechsel starten“).

## Tests

`tests/procedure.test.ts` (Ablauf der Flexfill, Prüfungen), `tests/app.test.ts` (ganzer Ablauf mit
Vier-Augen-Prinzip, Rezeptprüfung), `tests/e2e/format.spec.ts` (Oberfläche; stoppt die simulierte Linie und
läuft deshalb im Playwright-Projekt `shell-line-stop` nach den anderen Shell-Tests).
