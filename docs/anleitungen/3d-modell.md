# 3D-Modell einer Linie einbinden

Für Konstruktion und Automatisierung: Nach dieser Anleitung erscheint eine Linie als 3D-Bild im
Linien-Dashboard, mit Markierungen an den Alarmstellen ([ADR-010](/adr/ADR-010-3d-ansicht)).

1. **Modell exportieren** – aus dem CAD als glTF-Binärdatei (`.glb`), Einheit Meter, Linie entlang der x-Achse,
   Vorderseite (Bedienseite) Richtung +z, y nach oben. Details reduzieren: Ziel unter 20 MB.
   _Ergebnis:_ eine Datei, z. B. `flexfill.glb`.
2. **Baugruppen benennen** – je Maschine eine Baugruppe mit der `machineId` als Namen (z. B. `l3-fill`), Bauteile
   an Alarmstellen als `l3-fill/<funktion>` (z. B. `l3-fill/waegezelle-3`).
   _Ergebnis:_ Im glTF stehen diese Namen als Knotennamen (prüfbar z. B. mit dem glTF-Viewer von Khronos).
3. **Zuordnung schreiben** – neben das Modell eine Datei `<name>.model.json`:

   ```json
   {
     "lineId": "l3",
     "model": "flexfill.glb",
     "machines": [{ "machineId": "l3-fill", "nodes": ["l3-fill", "l3-fill/*"] }],
     "alarms": [
       {
         "alarmId": "FILL-WGT-0003",
         "machineId": "l3-fill",
         "label": { "de": "Wägezelle 3", "en": "Load cell 3" },
         "node": "l3-fill/waegezelle-3"
       }
     ]
   }
   ```

   Ohne benannte Teile (Blockmodell): `"xRange": [von, bis]` je Maschine und `"position": [x, y, z]` je
   Alarmstelle.
   _Ergebnis:_ Die Datei entspricht `modules/dashboard/schemas/line-model.schema.json`.

4. **Ablegen** – beide Dateien in den Ordner `DASHBOARD_MODEL_DIR` des Dashboard-Moduls der Linie (Entwicklung:
   `packages/simulator/fixtures/models/`) und das Modul neu starten.
   _Ergebnis:_ Im Log steht „3D-Modell für l3: …“. Fehler in der Zuordnung stehen mit Begründung im Log; das
   Dashboard zeigt dann nur den Linienfluss.
5. **Prüfen** – Linienübersicht öffnen: Jede Maschine ist im Bild beschriftet, ein Antippen öffnet ihre
   Detailseite. Anstehende Alarme mit Fehlerbaum sind markiert.
   _Ergebnis:_ Die Markierung öffnet die geführte Fehlersuche zu diesem Alarm.
