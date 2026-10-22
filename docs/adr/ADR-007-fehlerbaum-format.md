# ADR-007: Format der Fehlerbäume

Status: angenommen
Datum: 2026-10-22

## Kontext

Die geführte Fehlersuche führt in Ja/Nein-Fragen von einem Alarm zur Lösung (Mockup „Geführte Fehlersuche“).
Die Fehlerbäume kommen später aus einem separaten System (E-15, O-01); dessen Format ist noch offen. Bis dahin
braucht die Plattform ein eigenes, prüfbares Format, auf das ein Import aus dem Fremdsystem abbildet.

## Entscheidung

Ein Fehlerbaum ist eine JSON-Datei nach `modules/troubleshooting/schemas/fault-tree.schema.json`:

| Feld          | Inhalt                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `id`          | kebab-case, eindeutig                                                                                               |
| `version`     | ganze Zahl; wird bei jeder inhaltlichen Änderung erhöht und mit jedem Lösungsweg gespeichert                        |
| `title`       | Text je Sprache (`de` Pflicht)                                                                                      |
| `machineType` | Maschinentyp wie `identity.type` – für den Einstieg „Nach Symptom“                                                  |
| `alarmIds`    | stabile `alarmId`s, zu denen der Baum passt – für den Deep Link aus Alarmen                                         |
| `start`       | ID des ersten Knotens                                                                                               |
| `nodes`       | Knoten `question` (`text`, optional `hint`, `media`, `yes`, `no`) oder `result` (`text`, `detail`, optional `part`) |

Über das Schema hinaus prüft das Modul beim Laden (`checkTree`): Start und alle Ziele existieren, keine
Schleifen, jeder Knoten ist erreichbar. Ungültige Bäume werden mit Begründung im Log abgelehnt und nicht
angeboten. `part` ist eine Ersatzteilnummer und führt per Deep Link in den Ersatzteilkatalog.

Die Zuordnung Alarm → Baum über `alarmIds` veröffentlicht das Modul beim Core als Einsprungpunkte
(ADR-008); nur für diese Alarme erscheint „Fehlersuche“.

## Alternativen

- **Format des künftigen Fehlerbaum-Systems übernehmen:** noch nicht bekannt (O-01).
- **Bäume in der Datenbank des Moduls pflegen:** bräuchte einen Editor; Pflege liegt beim Fremdsystem.
- **Mehrwertige Antworten statt Ja/Nein:** das Mockup zeigt nur Ja/Nein; erweiterbar über eine neue Knotenart.

## Konsequenzen

- Beispielbäume aus dem Mockup liegen in `packages/simulator/fixtures/fault-trees/`; der Ordner ist mit
  `FAULT_TREES_DIR` einstellbar.
- Der Import aus dem Fremdsystem (O-01) bildet auf dieses Format ab; das Schema ist die Prüfgrundlage.
- Dokumentierte Lösungswege speichern `treeId` und `version`, damit Auswertungen auch nach Änderungen am Baum
  stimmen.
