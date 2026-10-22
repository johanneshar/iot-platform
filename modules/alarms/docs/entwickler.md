# Alarm-Analytics – Entwicklerdoku

Für Entwicklerinnen und Entwickler: Aufbau, Datenfluss und Berechnungen der Alarmliste und der Top-Störungen.

## Aufbau

| Datei                           | Inhalt                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| `manifest.ts`                   | ID `alarms`, Navigation „Alarme“ (Abschnitt Linie, Reihenfolge 20), Mindeststufe `standard`  |
| `frontend/entry.tsx`            | Seite und Zähler in der Navigation (anstehende Alarme der Linie)                             |
| `frontend/pages/AlarmsPage.tsx` | Seite nach Mockup: Alarmliste mit Filter, Top-Störungen                                      |
| `frontend/rows.ts`              | Zusammenführen von anstehenden Alarmen (Core) und Verlauf (Modul), Filter                    |
| `backend/history.ts`            | `AlarmHistory`: Verlauf in SQLite, Top-Störungen, Aufbewahrung                               |
| `backend/app.ts`                | API hinter dem Proxy des Core ([ADR-008](../../../docs/adr/ADR-008-modul-backends-proxy.md)) |
| `backend/main.ts`               | abonniert die kanonischen `alarms`-Topics der Linie, liefert `entry.js`, meldet sich an      |

## Datenfluss

- **Anstehende Alarme:** Datenkern im Core → `useAlarms()` – maßgeblich und live.
- **Verlauf:** Databus → `subscribeLine` (nur schemakonforme Nachrichten) → `AlarmHistory` → `GET history`.
  Offene Einträge im Verlauf ohne Gegenstück im Core werden nicht angezeigt.

Ereignisse (`alarms`) sind nicht retained; den Stand der anstehenden Alarme liefert `activeAlarms` (retained,
ADR-012). Damit gleicht das Modul seinen Verlauf beim Start und bei jeder Änderung ab: verpasste Alarme mit
`raisedAt` nachtragen, nicht mehr anstehende schließen.

## API (über `/api/modules/alarms/…`)

| Aufruf                  | Antwort                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| `GET history?days=1`    | Alarme, die im Zeitraum gekommen sind oder noch anstehen, neueste zuerst |
| `GET top-faults?days=7` | bis zu 5 Störungen mit Summe der Minuten und Anzahl                      |

`days` ist 1 bis zur Aufbewahrungszeit. Ein Aufruf zum Quittieren existiert nicht (E-32).

## Berechnungen

- **Top-Störungen (E-33):** Alarme der Klasse `fault`, je Maschine und `alarmId` die Summe der Dauer
  „kommt“ bis „geht“, nur der Anteil im Zeitraum; anstehende Störungen zählen bis jetzt. Ohne Dauer keine
  Top-Störung.
- **Aufbewahrung (E-34):** `ALARMS_RETENTION_DAYS`, Standard 90; abgeschlossene Alarme werden stündlich
  gelöscht.

## Konfiguration

| Variable                          | Standard                |
| --------------------------------- | ----------------------- |
| `MODULE_PORT`                     | 4102                    |
| `LINE_ID`                         | `l1`                    |
| `MQTT_URL`                        | `mqtt://localhost:1883` |
| `ALARMS_RETENTION_DAYS`           | 90                      |
| `MODULE_DATA_DIR`                 | `.data/<LINE_ID>/`      |
| `CORE_URL`, `CORE_REGISTRY_TOKEN` | wie Vorlage             |

## Deep Links

| Schaltfläche | Ziel                                                | Erscheint, wenn                      |
| ------------ | --------------------------------------------------- | ------------------------------------ |
| Fehlersuche  | `navigate('troubleshooting', { alarmId, machine })` | Fehlersuche hat einen Baum zum Alarm |

## Abweichungen vom Mockup

- Kein „Quittieren“-Button (E-32); stattdessen Status „Steht an“, „An der Maschine quittiert“ oder
  „Gegangen hh:mm“.
- Im Dev-Betrieb bleiben die Top-Störungen zunächst leer: Der Simulator meldet die gegangenen Alarme des
  Mockups ohne Dauer, und die Liste aus dem Mockup wird nicht als erfundener Verlauf eingespielt.
