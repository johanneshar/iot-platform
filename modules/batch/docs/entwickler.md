# Batch-Reporting – Entwicklerdoku

Für Entwicklerinnen und Entwickler: Aufbau, Datenfluss, Ablauf mit Signaturen und Bericht des Batch-Reportings
(GxP-relevant, Mindeststufe `full`).

## Aufbau

| Datei                          | Inhalt                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `manifest.ts`                  | ID `batch`, Navigation Linie (30), `gxp: true`, Rechte `batch.sign`, `batch.review`, `batch.clear`, `batch.export` |
| `backend/store.ts`             | `BatchStore`: Batches, Ereignisse, GxP-Rohwerte, Zähler, Alarme, Datenlücken, Linienfreigaben (SQLite)             |
| `backend/report.ts`            | Bericht bauen, Mengen (`counterStep`), kanonisches JSON, Bericht-Hash                                              |
| `backend/app.ts`               | API hinter dem Proxy; prüft jeden Schritt am Audit Trail des Core                                                  |
| `backend/pdf.ts`               | Bericht als PDF/A-2b (pdfkit, DejaVu Sans eingebettet)                                                             |
| `backend/main.ts`              | Abo der Linie, Anmeldung, Linienkonfiguration und Audit Trail über den Core                                        |
| `shared/batch.ts`              | Typen für Backend und Oberfläche                                                                                   |
| `frontend/pages/BatchPage.tsx` | Seite nach Mockup „Batch-Reporting“                                                                                |

Entscheidungen: [ADR-011](../../../docs/adr/ADR-011-batchbericht.md), E-40 bis E-44.

## Datenfluss

Databus → `subscribeLine` → `BatchStore`. Ein Batch fasst alle Maschinen zusammen, die `started` mit derselben
`batchId` melden; er ist beendet, wenn alle `ended` gemeldet haben. Gespeichert wird nur, solange die Maschine
einen laufenden Batch hat. Prozesswerte nur mit `gxp: true` im Wertekatalog, als Rohwerte mit Quellzeitstempel
und Qualität. Datenlücke: mehr als 60 s ohne Nachricht der Maschine. `batch` ist retained und trägt `startedAt`
(ADR-012): Ein verpasster Start wird nachgetragen, die Zeit bis zur ersten Nachricht ist eine Datenlücke.
Anstehende Alarme gleicht das Modul mit `activeAlarms` ab.

## Ablauf und Prüfung der Schritte

| Schritt        | Oberfläche                     | Eintrag im Audit Trail                                              | Backend prüft                             |
| -------------- | ------------------------------ | ------------------------------------------------------------------- | ----------------------------------------- |
| Linienfreigabe | `useRequestSignature`          | `batch.line-released`, „Linienfreigabe“, Bezug `batch:line-release` | `batch.sign`                              |
| Linienräumung  | `useAudit().record`            | `batch.line-cleared`, Bezug `batch:<id>`                            | `batch.clear`, Batch beendet              |
| Geprüft        | `useRequestSignature`          | `batch.report-reviewed`, „Geprüft“, Wert = Bericht-Hash             | `batch.review`, Bericht eingefroren       |
| Freigabe       | `useRequestSignature`          | `batch.report-released`, „Freigabe“, Wert = Bericht-Hash            | `batch.sign`, andere Person als „Geprüft“ |
| PDF/A          | `useAudit().record` + Download | `batch.report-exported`                                             | `batch.export`                            |

Die Oberfläche schickt nur die laufende Nummer (`seq`); das Backend liest den Eintrag mit Dienst-Token
(`fetchAuditEntry`) und prüft Vorgang, Bedeutung, Benutzer, Bezug, Hash und Alter (≤ 10 min). Nach der
Linienräumung wird der Bericht eingefroren; ein Trigger verhindert Änderungen.

## API (über `/api/modules/batch/…`)

| Aufruf                                                | Antwort                                                                    |
| ----------------------------------------------------- | -------------------------------------------------------------------------- |
| `GET batches`                                         | Batches, neueste zuerst                                                    |
| `GET batches/:id`                                     | Batch mit Mengen, Bericht (falls eingefroren) und Einträgen im Audit Trail |
| `GET line-release`, `POST line-release`               | offene Linienfreigabe; neue übernehmen `{ seq }`                           |
| `POST batches/:id/clearance`, `…/review`, `…/release` | Schritt übernehmen `{ seq }`; 400, 403, 409                                |
| `GET batches/:id/report.pdf`                          | Bericht als PDF/A-2b                                                       |

## Konfiguration

| Variable                          | Standard                      |
| --------------------------------- | ----------------------------- |
| `MODULE_PORT`                     | 4104 (E2E 4114, Linie 3 4204) |
| `LINE_ID`, `MQTT_URL`             | `l1`, `mqtt://localhost:1883` |
| `MODULE_DATA_DIR`                 | `.data/<LINE_ID>/`            |
| `CORE_URL`, `CORE_REGISTRY_TOKEN` | wie Vorlage                   |

## Abweichungen vom Mockup

- **Fortschritt nur mit Sollmenge:** Meldet die Maschine keine `targetQuantity`, zeigt die Seite die Laufzeit (S-10).
- **Audit Trail nur mit Vorgängen der Plattform:** Vorgänge an der Maschine wie „Sollfüllgewicht geändert“ sind nicht Teil der Schnittstelle (E-42, O-30).
- **Zusätzlich:** Liste aller Batches, Linienfreigabe für den nächsten Batch und Signatur „Geprüft“ (E-40, E-41).
