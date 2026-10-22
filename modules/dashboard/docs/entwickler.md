# Linien-Dashboard – Entwicklerdoku

Für Entwicklerinnen und Entwickler: Aufbau, Datenfluss und Berechnung der Linienübersicht.

## Aufbau

| Datei                             | Inhalt                                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `manifest.ts`                     | ID `dashboard`, Navigation „Linienübersicht“ (Linie, 10), Routen `''` und `machine`, Mindeststufe `basic` |
| `frontend/pages/OverviewPage.tsx` | Linienübersicht nach Mockup: KPI-Reihe, Linienfluss, anstehende Alarme                                    |
| `frontend/pages/MachinePage.tsx`  | Maschinen-Detailseite nach Mockup „M5a · Maschinendetail“                                                 |
| `frontend/kpi/kpi.ts`             | Kennzahlen der Linienübersicht aus dem Datenkern (reine Funktionen, `tests/kpi.test.ts`)                  |
| `backend/history-store.ts`        | Verlauf in SQLite ([ADR-009](../../../docs/adr/ADR-009-verlauf-dashboard.md))                             |
| `backend/analysis.ts`             | Auswertung einer Maschine im Zeitraum (reine Funktion, `tests/analysis.test.ts`)                          |
| `backend/periods.ts`              | Zeiträume aus `DASHBOARD_PERIODS`, Fenster, Abschnitte, Aufbewahrung                                      |
| `backend/app.ts`, `main.ts`       | API hinter dem Proxy des Core; Abo der Linie, Anmeldung, Linienkonfiguration vom Core                     |
| `shared/analysis.ts`              | Antworttypen für Backend und Oberfläche                                                                   |

## Datenfluss

- **Linienübersicht:** Datenkern im Core → `module-sdk` (`useLineData`, `useMachines`, `useAlarms`) → Seite
  ([ADR-005](../../../docs/adr/ADR-005-datenzugriff.md)).
- **Detailseite:** Databus → `subscribeLine` → `HistoryStore` → `GET machines/:id/analysis` →
  `useModuleData` → Seite. Zustand, Datenqualität und anstehende Alarme kommen live aus dem Datenkern.

## API (über `/api/modules/dashboard/…`)

| Aufruf                                   | Antwort                                                  |
| ---------------------------------------- | -------------------------------------------------------- |
| `GET periods`                            | eingestellte Zeiträume mit Bezeichnung de/en             |
| `GET machines/:id/analysis?period=shift` | `MachineAnalysis` (siehe `shared/analysis.ts`); 404, 503 |

## Konfiguration

| Variable                          | Standard                      | Bedeutung                                                       |
| --------------------------------- | ----------------------------- | --------------------------------------------------------------- |
| `DASHBOARD_PERIODS`               | `shift,24h,7d`                | Zeiträume der Detailseite (E-37), z. B. `30min,1h,shift,24h,7d` |
| `MODULE_PORT`                     | 4101                          |                                                                 |
| `LINE_ID`, `MQTT_URL`             | `l1`, `mqtt://localhost:1883` | Linie und Databus                                               |
| `MODULE_DATA_DIR`                 | `.data/<LINE_ID>/`            | SQLite-Datei des Verlaufs                                       |
| `CORE_URL`, `CORE_REGISTRY_TOKEN` | wie Vorlage                   |                                                                 |

Aufbewahrung: längster Zeitraum plus ein Tag; stündlich bereinigt.

## Kennzahlen (E-27)

Beobachtungszeitraum: vom ersten Zählerstand der laufenden Schicht bis jetzt.

| Kennzahl      | Berechnung                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------- |
| Verfügbarkeit | Zeit in `Execute` ÷ geplante Zeit                                                                 |
| Leistung      | Gesamtmenge ÷ (Sollleistung × Zeit in `Execute`)                                                  |
| Qualität      | Gutteile ÷ Gesamtmenge                                                                            |
| OEE           | Verfügbarkeit × Leistung × Qualität                                                               |
| Linien-OEE    | Kennzahlen der letzten Maschine der Linie (Gutteile am Linienende ÷ Sollleistung × geplante Zeit) |
| Ausbringung   | Gutteile am Linienende pro Stunde                                                                 |

Engpass nach E-28 (`findBottleneck` im SDK). Erst nach 10 s Beobachtung erscheinen Werte, vorher „—“.

Auf der Detailseite gelten dieselben Formeln über den gewählten Zeitraum. Geplante Zeit = Schichten des
Schichtmodells im Zeitraum, ab dem ersten gespeicherten Zählerstand. Stillstand = jeder Abschnitt außer
`Execute`; als Ursache gilt der Alarm (Störung vor Warnung), der bis 1 min vor Beginn kam. Prozesswerte
erscheinen nur mit Eintrag im Wertekatalog (`meta`), Grenzen aus `min`/`max` (S-06). Fremdmaschinen sehen
nur, was ihre Integrationsstufe liefert (E-39).

## Deep Links

| Schaltfläche                | Ziel                                                |
| --------------------------- | --------------------------------------------------- |
| Ersatzteile dieser Maschine | `navigate('spares', { machine })`                   |
| Formatwechsel starten       | `navigate('format')`                                |
| Wartungsprognose            | `navigate('predictive-maintenance', { machine })`   |
| Alle Alarme anzeigen        | `navigate('alarms')`                                |
| Fehlersuche starten         | `navigate('troubleshooting', { alarmId, machine })` |
| Maschine im Linienfluss     | `navigate('dashboard', { id }, 'machine')` (E-38)   |
| ← Linienübersicht           | `navigate('dashboard')`                             |

„Fehlersuche starten“ erscheint nur an Alarmen, zu denen die Fehlersuche einen Einsprungpunkt gemeldet hat
(`useDeepLinkTargets`, [ADR-008](../../../docs/adr/ADR-008-modul-backends-proxy.md)).

## Abweichungen vom Mockup

- Werte werden berechnet, nicht aus dem Mockup übernommen (E-30).
