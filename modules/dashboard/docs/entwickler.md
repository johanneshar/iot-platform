# Linien-Dashboard – Entwicklerdoku

Für Entwicklerinnen und Entwickler: Aufbau, Datenfluss und Berechnung der Linienübersicht.

## Aufbau

| Datei                             | Inhalt                                                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `manifest.ts`                     | ID `dashboard`, Navigation „Linienübersicht“ (Abschnitt Linie, Reihenfolge 10), Mindeststufe `basic`, nicht GxP |
| `frontend/pages/OverviewPage.tsx` | Seite nach Mockup: KPI-Reihe, Linienfluss, Maschinendetails, anstehende Alarme                                  |
| `frontend/kpi/kpi.ts`             | Kennzahlen nach E-27 (reine Funktionen, `tests/kpi.test.ts`)                                                    |
| `backend/main.ts`                 | liefert `entry.js` aus und meldet das Manifest beim Core an                                                     |

## Datenfluss

Simulator bzw. Normalizer → Databus → Datenkern im Core → `module-sdk` (`useLineData`, `useMachines`,
`useAlarms`, `useValues`) → Seite. Siehe [ADR-005](../../../docs/adr/ADR-005-datenzugriff.md).

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

## Deep Links

| Schaltfläche                | Ziel                                              |
| --------------------------- | ------------------------------------------------- |
| Ersatzteile dieser Maschine | `navigate('spares', { machine })`                 |
| Formatwechsel starten       | `navigate('format')`                              |
| Wartungsprognose            | `navigate('predictive-maintenance', { machine })` |
| Alle Alarme anzeigen        | `navigate('alarms')`                              |

„Fehlersuche starten“ an einem Alarm folgt mit M5, sobald bekannt ist, zu welchen Alarmen ein Fehlerbaum
existiert.

## Abweichungen vom Mockup

- Kachel „Hersteller“ statt „Datenquelle“: die Schnittstelle kennt keine Datenquelle (O-23).
- Werte werden berechnet, nicht aus dem Mockup übernommen (E-30).
