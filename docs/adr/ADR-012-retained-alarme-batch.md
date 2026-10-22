# ADR-012: Anstehende Alarme und laufender Batch für Nachzügler (Entwurf 0.4)

Status: angenommen
Datum: 2026-10-22

## Kontext

Alarm- und Batch-Ereignisse waren nicht retained. Wer sich später verband – ein neu gestarteter Core, ein
Modul nach einem Update, ein zweiter Core einer Linie –, kannte weder die anstehenden Alarme noch den
laufenden Batch (O-25, O-31). Als Übergang hatte der Simulator anstehende Alarme wiederholt (ADR-010, Punkt 6).
Entschieden am 2026-10-22: Alarme und Batch-Ereignisse müssen gespeichert werden; Produktname und Sollmenge
kann die Maschine liefern (O-33).

## Entscheidung

1. **S-08:** Topic `batch` ist retained. Jede Batch-Meldung trägt `startedAt` (Pflicht). Die letzte Meldung
   zeigt den laufenden Batch auch einem Nachzügler; ein verpasster Start wird mit `startedAt` angelegt, die Zeit
   ohne Daten als Datenlücke ausgewiesen.
2. **S-09:** Neue Datenklasse `activeAlarms` (retained): vollständige Liste der anstehenden Alarme mit
   `raisedAt`, Quittierung und Benutzer, bei jeder Änderung. Pflicht in allen Stufen (Basis: nur
   `COMMON-FAULT`). `alarms` bleibt der Ereignisstrom für den Verlauf.
3. **S-10:** Batch-Meldungen tragen `productName` (Pflicht) und `targetQuantity` (Sollmenge in Stück,
   optional).
4. **Plattform:** Der Datenkern übernimmt `activeAlarms` als maßgeblichen Stand. Alarm-, Dashboard- und
   Batch-Modul gleichen ihren Verlauf damit ab: verpasste Alarme mit `raisedAt` nachtragen, nicht mehr
   anstehende schließen. Die Wiederholung im Simulator entfällt.
5. **Version:** Schemaversion bleibt 1.0, solange keine Maschine angebunden ist (ADR-003, Punkt 4).

## Alternativen

- **Ereignisse wiederholen** (bisheriger Übergang): verschiebt die Last auf jede Quelle, Zeitpunkte unklar.
- **Stand vom Core holen:** Module sollen die Schnittstelle lesen, nicht einander; der Core hätte denselben
  Neustart-Effekt.
- **Persistente Sitzungen im Broker:** hilft nur Clients mit fester Kennung und nicht bei neuen Modulen.

## Konsequenzen

- Die Automatisierung liefert je Maschine `activeAlarms` und den retained `batch` (Mapping, M9;
  Konformitätsprüfer prüft beides).
- Die Seite des Batch-Reportings zeigt Produktname und Fortschritt wie im Mockup, sobald die Maschine eine
  Sollmenge meldet.
- O-25, O-31 und O-33 sind erledigt; ADR-010, Punkt 6 ist durch diese Entscheidung ersetzt.
