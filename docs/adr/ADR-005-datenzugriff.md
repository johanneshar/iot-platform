# ADR-005: Datenzugriff über den Datenkern des Core

Status: angenommen
Datum: 2026-10-22

## Kontext

Module dürfen Maschinendaten nur über das `module-sdk` lesen, nie direkt von Connector-Topics (CLAUDE.md,
Abschnitt 4). Browser können MQTT nicht direkt abonnieren, und jedes Modul eine eigene Verbindung zum
Databus aufbauen zu lassen, würde Prüfung, Qualitätskennzeichnung und Verlauf vervielfachen. Kennzahlen wie die
Verfügbarkeit brauchen außerdem einen Zeitverlauf seit Schichtbeginn.

## Entscheidung

1. **Datenkern im Core** (`apps/core/backend/src/data/`): Der Core abonniert `iot/v1/<lineId>/+/+`, prüft jede
   Nachricht gegen `@iot/interface-schema` und übernimmt nur gültige. Ungültige zählt er je Maschine.
2. **Linienmodell** je Maschine: letzte Identität, Katalog, Zustand (mit „seit“), Zähler, Prozesswerte,
   anstehende Alarme, schlechteste Datenqualität der letzten Nachrichten und der Verlauf der laufenden
   Schicht (Zustandswechsel, erster Zählerstand, Zählerstände der letzten Minuten). Das Schichtmodell steht in
   der Linienkonfiguration (E-29).
3. **Zum Browser** per Server-Sent Events (`GET /api/data/stream`, höchstens alle 500 ms) und als Abfrage
   (`GET /api/data`) – beides nur mit Anmeldung.
4. **Für Module** Hooks im `module-sdk`: `useLineData`, `useMachines`, `useMachine`, `useMachineState`,
   `useCounters`, `useAlarms`, `useValues`. Gemeinsame Auswertung für Shell und Module: `findBottleneck`
   (E-28), `lineState`, `currentRate`.
5. **Kennzahlen** (OEE nach E-27) berechnet das Modul aus diesen Daten; der Core liefert Daten, keine
   Fachlogik.

## Alternativen

- **MQTT über WebSocket direkt im Browser:** jedes Modul müsste prüfen, puffern und Rechte durchsetzen; der
  Databus wäre aus dem Kundennetz erreichbar.
- **Eigenes Backend je Modul für Kennzahlen:** bis zur Auslieferung über den Proxy des Core (O-19) ohne
  Anmeldung erreichbar; Verlauf mehrfach geführt.

## Konsequenzen

- Der Verlauf liegt im Speicher des Core und beginnt nach einem Neustart neu (O-22).
- Alarm- und Batch-Ereignisse sind nicht retained: Startet der Core nach dem Simulator, fehlen bis zum
  nächsten Ereignis die anstehenden Alarme. Im Betrieb puffert der Normalizer (M9).
- Module mit eigenem Verlauf über Tage (Alarm-Analytics, Condition Monitoring) brauchen eigene Speicherung.
