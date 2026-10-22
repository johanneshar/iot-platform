# Simulator nutzen

Für Entwicklerinnen und Entwickler: Nach dieser Anleitung laufen die Daten der Linie 3 · Flexfill über MQTT –
ohne Maschine und ohne Edge Device.

## Starten

1. **Starten**

   ```bash
   pnpm dev
   ```

   _Ergebnis:_ Der MQTT-Broker läuft im Prozess auf Port 1883 (ohne Docker), der Simulator meldet
   `Simulator: verbunden mit mqtt://localhost:1883, sende Linie 3 · Flexfill`.
   Er startet erst, wenn der Core die Topics abonniert hat – sonst gingen die anstehenden Alarme verloren. Mit
   Mosquitto in Docker: `pnpm dev:mosquitto`.

2. **Daten mitlesen** (optional, mit einem MQTT-Client)

   ```bash
   pnpm dlx mqtt@5.16.1 sub -h localhost -t 'iot/v1/#' -v
   ```

   _Ergebnis:_ Retained-Topics (`identity`, `meta`, `state`, `counters`) erscheinen sofort, die Zähler alle
   5 s, die Prozesswerte alle 10 s.

Nur der Simulator, ohne Shell: `pnpm --filter @iot/simulator start`. Anderer Broker:
`MQTT_URL=mqtt://host:1883`.

## Was gesendet wird

Seit 2026-10-22 simuliert der Simulator nur noch die Linie 3 · Flexfill (E-47, `fixtures/flexfill.ts`). Die
Mockup-Daten der Linien 1 und 2 (`fixtures/mockup.ts`) nutzt nur noch Storybook.

| Maschine                     | ID            | Stufe | Topics                                                                       |
| ---------------------------- | ------------- | ----- | ---------------------------------------------------------------------------- |
| Isolator (Fremdmaschine)     | `l3-iso`      | basic | identity, state, counters (gut/gesamt), alarms/activeAlarms (`COMMON-FAULT`) |
| Beutelauspacker              | `l3-debag`    | full  | alle, inkl. batch und quittierte Alarme                                      |
| Öffner (Delid/Delining)      | `l3-delid`    | full  | alle, inkl. batch und quittierte Alarme                                      |
| Füll- und Verschließmaschine | `l3-fill`     | full  | alle, inkl. batch und quittierte Alarme                                      |
| Transfermodul                | `l3-transfer` | full  | alle, inkl. batch und quittierte Alarme                                      |
| Bördelmodul                  | `l3-cap`      | full  | alle, inkl. batch und quittierte Alarme                                      |

Aufbau nach Beschreibung vom 2026-10-22: Isolator → Beutelauspacker → Öffner → Füll- und Verschließmaschine →
Transfermodul (Gut-/Schlechtauslauf, Roboter) → Bördelmodul. Alle Maschinen außer dem Isolator sind eigene
Maschinen der Stufe Voll. 3D-Modell: `fixtures/models/flexfill_blockmodell.glb` mit Zuordnung
`flexfill.model.json` (ADR-010).

- **Zähler** steigen mit der Leistung der Maschine, solange sie in `Execute` ist.
- Alle Nachrichten werden in den Tests gegen die Schemas geprüft.

## Annahmen {#annahmen}

Diese Werte hat der Simulator festgelegt; bestätigt am 2026-10-22 (E-48). Sie sind Platzhalter für die
Entwicklung, keine Maschinendaten.

| Thema                    | Annahme                                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Standort und Zeitzone    | `Europe/Berlin`, drei Schichten (06:00, 14:00, 22:00), kein OEE-Ziel hinterlegt                                                              |
| Leistung                 | Soll 100 /min, Ist 92 /min                                                                                                                   |
| Prozesswerte             | Tubs im Puffer, Abzugskraft Folie, Füllgewicht 2,01 g (Grenzen 1,95–2,05), Differenzdruck Isolator, Robotertakt, Bördelkraft (1.300–1.600 N) |
| Isolator                 | Fremdsteuerung, Basissignale über S7-Connector; Zähler gut 18.700; Sammelstörung um 12:40 (vergangen)                                        |
| Bördelmodul              | wechselt zwischen „Suspended – Einlauf leer“ (Alarm `CAP-INF-0001` „Einlauf: keine Vials“) und Lauf                                          |
| Alarme                   | `FILL-WGT-0003` (steht an), `FILL-STP-0001` (vergangen), `TRF-ROB-0001` Roboter (steht an, ohne Fehlerbaum), `CAP-INF-0001`, `COMMON-FAULT`  |
| Batch                    | `B-2026-3001`, Start 06:05, Rezept `vial-nest` v1, Produktname „[Produktname]“                                                               |
| Hersteller, Seriennummer | Platzhalter „[Hersteller]“, „[Seriennummer]“                                                                                                 |
| Betriebsart              | immer `Production`                                                                                                                           |
| 3D-Modell                | Positionen der Alarmstellen im Blockmodell; mit dem CAD-Export nach Namensregel (ADR-010) entfallen die Koordinaten                          |

## Batch-Zyklus (M6)

Annahme für die Entwicklung: Ein Batch läuft 15 min; nach 2 min Pause startet der nächste mit fortlaufender
Nummer (B-2026-3001 → B-2026-3002), die Zähler der Maschinen mit Batch beginnen bei null (`resetAt` =
Batchstart). Alle Maschinen der Stufe Voll einer Linie gehören zum selben Batch. Verkürzbar mit
`SIM_BATCH_RUN_MS` und `SIM_BATCH_PAUSE_MS` (E2E: 20 s / 5 s).

## Einschränkungen

- Anstehende Alarme (`activeAlarms`) und der laufende Batch (`batch`) sind retained (Entwurf 0.4, ADR-012):
  Später gestartete Cores und Module kennen den Stand sofort. Vergangene Alarmereignisse sieht nur, wer beim
  Start verbunden war.
- Produktname aller Batches ist der Platzhalter „[Produktname]“. Sollmenge (Annahme): für den ersten Batch
  Menge ÷ Fortschritt, für die folgenden Batches die Menge eines Batch-Laufs.
- Prozesswerte ändern sich nicht. Weitere Dynamik (Rauschen, neue Alarme) kommt bei Bedarf mit den Modulen,
  die sie brauchen.
