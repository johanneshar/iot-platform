# ADR-010: 3D-Ansicht der Linie und Zuordnung der Alarmstellen

Status: angenommen
Datum: 2026-10-22

## Kontext

A-01 verlangt eine 3D-Ansicht der Linie im Linien-Dashboard: Modelle aus dem CAD (glTF/GLB), Alarme an der
betroffenen Stelle markiert, Berühren der Markierung öffnet die Fehlersuche, Antippen einer Maschine ihre
Detailseite. Die Zuordnung Alarm → Stelle erfolgt in der Plattform über die stabile `alarmId` (A-01.3), nicht
über die Schnittstelle. Das erste Modell (Flexfill) ist ein Blockmodell ohne benannte Bauteile.

## Entscheidung

1. **Darstellung:** `ModelViewer` in `@iot/ui` mit three.js (0.186.1, GLTFLoader, OrbitControls). three.js wird
   erst beim ersten Anzeigen nachgeladen (eigener Chunk der Shell). Gerendert wird nur bei Bedarf.
2. **Bedienung:** Drehen und Zoomen mit Maus bzw. Touch, Schaltflächen für Vergrößern, Verkleinern,
   Zurücksetzen und Vollbild. Markierungen und Maschinennamen sind HTML-Schaltflächen über dem Bild, damit sie
   per Tastatur und Screenreader bedienbar sind. Auf der Detailseite treten die übrigen Maschinen zurück.
3. **Zuordnungsdatei** `*.model.json` neben dem Modell, Schema `modules/dashboard/schemas/line-model.schema.json`:
   - `lineId`, `model` (Dateiname),
   - `machines[]`: `machineId` mit `nodes` (Knotennamen, `*` als Platzhalter) und/oder `xRange` (Abschnitt
     entlang der Linie; Teile, die ganz darin liegen),
   - `alarms[]`: `alarmId`, `machineId`, `label` je Sprache, `position` (x, y, z) oder `node`.
     Das Dashboard-Backend prüft die Datei beim Start, löst die Teile je Maschine aus dem Modell auf und liefert
     `GET model` (Zuordnung) und `GET model/file` (Modell) über den Proxy des Core. Ordner: `DASHBOARD_MODEL_DIR`.
4. **Markierungen** nur für anstehende Alarme mit Eintrag in der Zuordnung **und** Einsprungpunkt der
   Fehlersuche (gebucht und Fehlerbaum vorhanden: A-01.7, A-01.9).
5. **Namensregel für CAD-Exporte** (Konstruktion, A-01.10): Baugruppe je Maschine heißt wie ihre `machineId`
   (z. B. `l3-fill`), Bauteile darunter `l3-fill/<funktion>` (z. B. `l3-fill/waegezelle-3`). Dann genügt
   `"nodes": ["l3-fill", "l3-fill/*"]` und je Alarmstelle `"node": "l3-fill/waegezelle-3"` – keine Koordinaten.
6. **Anstehende Alarme nach einem Neustart (O-25):** Bis die Spezifikation das regelt, wiederholt der Simulator
   anstehende Alarme alle 30 s mit dem ursprünglichen Zeitstempel. Core, Alarm- und Dashboard-Modul behandeln
   eine wiederholte Meldung „kommt“ als dieselbe Meldung.

## Alternativen

- **Babylon.js oder `<model-viewer>`:** größer bzw. weniger Kontrolle über Auswahl und Markierungen.
- **Markierungen im WebGL-Bild:** nicht per Tastatur erreichbar, keine Barrierefreiheit.
- **Zuordnung in der Schnittstelle:** ausgeschlossen (A-01.3); die Maschine kennt ihr 3D-Modell nicht.
- **Bauteilnamen aus dem CAD übernehmen, wie sie sind:** uneinheitlich je Konstrukteur; die Namensregel macht
  Zuordnungen kurz und stabil über Modellstände.

## Konsequenzen

- Ohne Zuordnung für die Linie zeigt die Linienübersicht nur den Linienfluss (A-01.4).
- Blockmodelle brauchen Koordinaten für Alarmstellen (Platzhalter, O-28); echte CAD-Exporte nach Namensregel
  nicht.
- Visuelle Regressionstests vergleichen die Bedienelemente; die WebGL-Fläche selbst wird ausgeblendet.
- WebGL ist Voraussetzung; ohne erscheint ein Hinweis statt des Bildes.
