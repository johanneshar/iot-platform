# Modulübersicht

Für Vertrieb, Projektleitung und Entwicklung: Diese Tabelle zeigt alle Module des Baukastens mit Kategorie,
Mindeststufe, GxP-Relevanz und dem Meilenstein, in dem sie entstehen.

## Kern (immer enthalten)

| Baustein               | Umsetzung                       | GxP              | Meilenstein |
| ---------------------- | ------------------------------- | ---------------- | ----------- |
| Datenkern              | `apps/core` + `apps/normalizer` | ja (Datenquelle) | M3, M9      |
| Benutzer & Audit Trail | `apps/core`                     | ja               | M3          |

## Buchbare Module

| ID                       | Name                    | Kategorie      | Mindeststufe                           | GxP           | Meilenstein |
| ------------------------ | ----------------------- | -------------- | -------------------------------------- | ------------- | ----------- |
| `dashboard`              | Linien-Dashboard        | Produktion     | basic                                  | nein          | M4 ✓        |
| `alarms`                 | Alarm-Analytics         | Produktion     | standard                               | nein          | M5 ✓        |
| `troubleshooting`        | Geführte Fehlersuche    | Instandhaltung | standard                               | nein          | M5 ✓        |
| `batch`                  | Batch-Reporting         | Produktion     | full                                   | ja            | M6 ✓        |
| `format`                 | Geführter Formatwechsel | Produktion     | basic (Rezeptprüfung ab full, ADR-013) | ja            | M7 ✓        |
| `spares`                 | Ersatzteilkatalog       | Instandhaltung | basic, nur eigene Maschinen (ADR-013)  | nein          | M7 ✓        |
| `condition-monitoring`   | Condition Monitoring    | Instandhaltung | full, nur eigene Maschinen             | nein          | M8          |
| `predictive-maintenance` | Predictive Maintenance  | Instandhaltung | full, nur eigene Maschinen             | nein          | M8          |
| `mes-integration`        | Integration MES/ERP     | Integration    | offen                                  | je nach Daten | M11         |
| `data-export`            | Datenexport (Data Act)  | Integration    | offen                                  | nein          | M11         |
| `remote-service`         | Remote-Service          | Instandhaltung | offen                                  | prüfen        | M12         |
| `energy-monitoring`      | Energie-Monitoring      | Integration    | offen                                  | nein          | M12         |

Kategorien und Beschreibungen entsprechen dem Baukasten im Mockup. Mindeststufen nach
Schnittstellenspezifikation; offene Fälle stehen in den [offenen Punkten](/offene-punkte).

Jedes Modul bekommt mit seiner Umsetzung eine eigene Seite mit Entwickler-, Anwender- und Schulungsdoku.
✓ = umgesetzt ([Linien-Dashboard](/module/dashboard), [Alarm-Analytics](/module/alarms),
[Geführte Fehlersuche](/module/troubleshooting), [Batch-Reporting](/module/batch),
[Geführter Formatwechsel](/module/format), [Ersatzteilkatalog](/module/spares)).
