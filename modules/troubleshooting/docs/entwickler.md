# Geführte Fehlersuche – Entwicklerdoku

Für Entwicklerinnen und Entwickler: Aufbau, Fehlerbaum-Format, API und Deep Links der geführten Fehlersuche.

## Aufbau

| Datei                                    | Inhalt                                                                                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `manifest.ts`                            | ID `troubleshooting`, Navigation Service (Reihenfolge 10), Mindeststufe `standard`, Rechte `troubleshooting.use`, `troubleshooting.document` |
| `schemas/fault-tree.schema.json`         | Format der Fehlerbäume ([ADR-007](../../../docs/adr/ADR-007-fehlerbaum-format.md))                                                           |
| `shared/fault-tree.ts`                   | Typen, `checkTree` (Ziele, Schleifen, Erreichbarkeit), `localized`                                                                           |
| `backend/trees.ts`                       | `loadTrees`: lädt `*.json`, prüft Schema und Aufbau, lehnt ungültige Bäume ab                                                                |
| `backend/solutions.ts`                   | `SolutionStore`: dokumentierte Lösungswege in SQLite, Statistik je Lösung                                                                    |
| `backend/app.ts`                         | API hinter dem Proxy des Core ([ADR-008](../../../docs/adr/ADR-008-modul-backends-proxy.md))                                                 |
| `backend/main.ts`                        | lädt die Bäume, meldet Manifest und Einsprungpunkte (`alarm`) beim Core an                                                                   |
| `frontend/flow.ts`                       | Ablauf: antworten, zurück, aktueller Knoten (reine Funktionen)                                                                               |
| `frontend/pages/TroubleshootingPage.tsx` | Einstieg „Zu aktivem Alarm“ / „Nach Symptom“, Schritt, Lösung, bisheriger Weg                                                                |

## API (über `/api/modules/troubleshooting/…`)

| Aufruf           | Recht                      | Antwort                                                           |
| ---------------- | -------------------------- | ----------------------------------------------------------------- |
| `GET trees`      | angemeldet                 | Übersicht: `id`, `version`, `title`, `machineType`, `alarmIds`    |
| `GET trees/:id`  | angemeldet                 | ganzer Baum, 404 wenn unbekannt                                   |
| `POST solutions` | `troubleshooting.document` | 201 mit Eintrag; 400, wenn der Weg nicht im Baum zur Lösung führt |
| `GET stats`      | angemeldet                 | Anzahl je Baum und Lösung                                         |

`POST solutions` erwartet `{ treeId, path: [{ node, answer: 'yes'|'no' }], resultNode, alarmId?, machineId? }`.
Benutzer und Zeit (UTC) setzt das Backend aus dem Proxy. Nicht GxP-relevant, kein Audit-Eintrag (E-35).

## Deep Links

| Einsprung          | Parameter                             | Wirkung                          |
| ------------------ | ------------------------------------- | -------------------------------- |
| `start` (Manifest) | `alarmId`, optional `machine`, `tree` | öffnet den passenden Baum direkt |

| Schaltfläche          | Ziel                                   |
| --------------------- | -------------------------------------- |
| Ersatzteil … anzeigen | `navigate('spares', { search: part })` |

Einsprungpunkte: `publishDeepLinkTargets(…, { alarm: [alle alarmIds der Bäume] })`. Alarmliste und Dashboard
zeigen „Fehlersuche“ nur für diese Alarme.

## Konfiguration

| Variable                          | Standard                                   |
| --------------------------------- | ------------------------------------------ |
| `MODULE_PORT`                     | 4103                                       |
| `FAULT_TREES_DIR`                 | `packages/simulator/fixtures/fault-trees/` |
| `MODULE_DATA_DIR`                 | `.data/`                                   |
| `CORE_URL`, `CORE_REGISTRY_TOKEN` | wie Vorlage                                |

## Abweichungen vom Mockup

- Bilder und 3D-Ansichten der Baugruppen sind Platzhalter, bis das Fehlerbaum-System sie liefert (O-01).
