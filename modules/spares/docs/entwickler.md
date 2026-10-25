# Ersatzteilkatalog – Entwicklerdoku

Für Entwicklerinnen und Entwickler: Aufbau, Datenquelle und Anfragen des Ersatzteilkatalogs (nicht GxP,
Mindeststufe `basic`, nur eigene Maschinen).

## Aufbau

| Datei                           | Inhalt                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `manifest.ts`                   | ID `spares`, Navigation Service (30), `ownMachinesOnly`, Rechte `spares.view`, `spares.request` |
| `schemas/catalog.schema.json`   | Format des Katalogs (ADR-013)                                                                   |
| `shared/spares.ts`              | Typen für Backend und Oberfläche                                                                |
| `backend/catalog.ts`            | Katalog laden und prüfen (Schema, eindeutige Nummern, bekannte Baugruppen)                      |
| `backend/requests.ts`           | `RequestStore`: Postausgang der Anfragen (SQLite), Vorgangsnummer `ANF-<Jahr>-<Nr.>`            |
| `backend/app.ts`                | API hinter dem Proxy                                                                            |
| `backend/main.ts`               | Abo der Linie (Identität, Zustand), Anmeldung, Einsprungpunkte                                  |
| `frontend/request-list.ts`      | Anfrageliste der Sitzung (auch Zähler in der Navigation)                                        |
| `frontend/pages/SparesPage.tsx` | Seite nach Mockup „Ersatzteilkatalog“                                                           |

Entscheidungen: [ADR-013](../../../docs/adr/ADR-013-formatwechsel-ersatzteile.md), E-15, E-16.

## Datenquelle

Bis zur PLM-Anbindung (O-02) ist der Katalog eine Datei: `SPARES_CATALOG`, Standard
`packages/simulator/fixtures/spares/flexfill.json`. Die Teile des Mockups sind der Füll- und
Verschließmaschine zugeordnet, die Formatteile „Spritze im Nest“ ihren Maschinen; Fremdmaschinen haben keine
Teile. Anfragen bleiben im Postausgang (`delivery: 'pending'`), bis das Ticketsystem angebunden ist (O-03).

## API (über `/api/modules/spares/…`)

| Methode | Pfad        | Zweck                                                                             |
| ------- | ----------- | --------------------------------------------------------------------------------- |
| GET     | `/catalog`  | Baugruppen, Teile, Maschinen der Linie (`spares.view`)                            |
| GET     | `/requests` | letzte 20 Anfragen                                                                |
| POST    | `/requests` | `{ items, machineId? }` – mit Maschinen-Nr., Linie und Zustand (`spares.request`) |

## Deep Links

| Parameter | Bedeutung                                          | Beispiel                                     |
| --------- | -------------------------------------------------- | -------------------------------------------- |
| `search`  | Suchbegriff; exakte Teilenummer wird hervorgehoben | `navigate('spares', { search: 'ET-50100' })` |
| `machine` | nur Teile dieser Maschine                          | `navigate('spares', { machine: 'l3-fill' })` |

Das Modul veröffentlicht als Einsprungpunkte `part` (alle Teilenummern) und `machine` (Maschinen mit Teilen).

## Tests

`tests/app.test.ts` (Katalog, Rechte, Anfragen), `tests/spares-page.test.ts` (Suche, Maschine der Anfrage),
`tests/e2e/spares.spec.ts` (Suche, Anfrageliste, Senden, Fremdmaschine).
