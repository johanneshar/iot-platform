# Simulator nutzen

Für Entwicklerinnen und Entwickler: Nach dieser Anleitung laufen die Daten von Linie 1 (Vials) und Linie 2
(Spritzen) aus dem Mockup über MQTT – ohne Maschine und ohne Edge Device.

## Starten

1. **Starten**

   ```bash
   pnpm dev
   ```

   _Ergebnis:_ Der MQTT-Broker läuft im Prozess auf Port 1883 (ohne Docker), der Simulator meldet
   `Simulator: verbunden mit mqtt://localhost:1883, sende Linie 1 · Vials und Linie 2 · Spritzen`.
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

| Maschine                     | ID          | Stufe    | Topics                                                              |
| ---------------------------- | ----------- | -------- | ------------------------------------------------------------------- |
| Waschmaschine                | `l1-wash`   | standard | identity, meta, state, counters, alarms, values                     |
| Sterilisationstunnel         | `l1-tunnel` | basic    | identity, state, counters (gut/gesamt), alarms (nur `COMMON-FAULT`) |
| Füll- und Verschließmaschine | `l1-fill`   | full     | alle, inkl. batch und quittierte Alarme                             |
| Inspektionsmaschine          | `l1-insp`   | standard | identity, meta, state, counters, alarms, values                     |
| Tub-Entdeckler               | `l2-detub`  | basic    | identity, state, counters (gut/gesamt), alarms (nur `COMMON-FAULT`) |
| Füll- und Verschließmaschine | `l2-fill`   | full     | alle, inkl. batch und quittierte Alarme                             |
| Etikettierer                 | `l2-label`  | standard | identity, meta, state, counters, alarms, values                     |

- **Zustände, Werte, Alarme, Batches** wie im Mockup. Die Uhrzeiten des Mockups gelten als Ortszeit am
  heutigen Tag.
- **Zähler** starten mit den Ständen des Mockups und steigen mit der Leistung der Maschine, solange sie in
  `Execute` ist.
- Alle Nachrichten werden in den Tests gegen die Schemas geprüft.

## Annahmen – nicht im Mockup enthalten

Diese Werte hat der Simulator festgelegt. Sie sind Platzhalter für die Entwicklung, keine Maschinendaten.

| Thema                      | Annahme                                                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Standort und Zeitzone      | `Europe/Berlin`                                                                                                                                                                     |
| Rücksetzen der Zähler      | Schichtbeginn 06:00 („Schicht seit 06:00“); Füllmaschinen: Batchstart                                                                                                               |
| Sollleistung je Maschine   | Sollleistung der Linie aus „286 von 320 /min“ bzw. „348 von 400 /min“                                                                                                               |
| Schlechtzähler             | Füllmaschinen aus den Batchdaten; Inspektion und Etikettierer aus der Ausschussquote; Waschmaschine 0                                                                               |
| `alarmId` und `textKey`    | im Simulator festgelegt (z. B. `FILL-CAP-0001`); `FILL-WGT-0003` stammt aus der Spezifikation                                                                                       |
| Vergangene Alarme          | kommen und gehen zur selben Uhrzeit (Dauer unbekannt); Quittierung durch „[Bediener]“ nur bei Stufe full                                                                            |
| Schlüssel der Prozesswerte | aus den Beschriftungen abgeleitet, z. B. „Wassertemperatur“ → `waterTemperature`                                                                                                    |
| GxP-Kennzeichnung          | nur Füllgewicht/-volumen und Standardabweichung (offen: O-16)                                                                                                                       |
| Hersteller, Seriennummer   | Platzhalter „[Hersteller]“, „[Seriennummer]“                                                                                                                                        |
| Rezept Linie 2             | `syringe-1ml`, Version 5, ohne Formatteile                                                                                                                                          |
| Betriebsart                | immer `Production`                                                                                                                                                                  |
| Zustandswechsel            | Maschinen, die im Mockup stehen (Inspektion, Linie 2), wechseln: 1 min Zustand aus dem Mockup, 9 min Execute (≈ 90 % Verfügbarkeit); der zugehörige Alarm kommt und geht mit (O-24) |
| Leistung im Lauf           | für diese Maschinen die Linienleistung aus der KPI „Leistung“: 286 bzw. 348 /min                                                                                                    |
| Datenquelle                | Texte aus dem Mockup in `identity.source` (S-07)                                                                                                                                    |

## Batch-Zyklus (M6)

Annahme für die Entwicklung: Ein Batch läuft 15 min; nach 2 min Pause startet der nächste mit fortlaufender
Nummer (B-2026-1042 → B-2026-1043), die Zähler der Maschinen mit Batch beginnen bei null (`resetAt` =
Batchstart). Alle Maschinen der Stufe Voll einer Linie gehören zum selben Batch. Verkürzbar mit
`SIM_BATCH_RUN_MS` und `SIM_BATCH_PAUSE_MS` (E2E: 20 s / 5 s).

## Linie 3 · Flexfill (nicht im Mockup)

Aufbau nach Beschreibung vom 2026-10-22 (`fixtures/flexfill.ts`): Beutelauspacker → Öffner (Delid/Delining) →
Füll- und Verschließmaschine → Transfermodul (Gut-/Schlechtauslauf, Roboter) → Bördelmodul; alle eigene
Maschinen der Stufe Voll. Starten mit `pnpm dev:line3` (eigener Core 4002, Shell
<http://localhost:5195>, Module 4201–4203), während `pnpm dev` läuft. 3D-Modell:
`fixtures/models/flexfill_blockmodell.glb` mit Zuordnung `flexfill.model.json`.

**Annahmen (O-28, zu bestätigen):** Sollleistung 100 /min, Ist 92 /min; Prozesswerte (Tubs im Puffer,
Abzugskraft Folie, Füllgewicht 2,01 g mit Grenzen 1,95–2,05, Differenzdruck Isolator, Robotertakt,
Bördelkraft mit Grenzen 1.300–1.600 N); Bördelmodul wechselt zwischen „Suspended – Einlauf leer“ und Lauf;
Alarme `FILL-WGT-0003` (steht an), `FILL-STP-0001` (vergangen), `TRF-ROB-0001` Roboter (steht an, ohne
Fehlerbaum); Batch `B-2026-3001`, Rezept `vial-nest` v1; Positionen der Alarmstellen im Blockmodell.

## Einschränkungen

- Alarm- und Batch-Ereignisse sind nicht retained. Anstehende Alarme wiederholt der Simulator alle 30 s mit dem
  ursprünglichen Zeitstempel (O-25), damit auch später gestartete Cores und Module sie sehen; vergangene Alarme
  und Batch-Ereignisse sieht nur, wer beim Start verbunden war.
- Prozesswerte ändern sich nicht. Weitere Dynamik (Rauschen, neue Alarme) kommt bei Bedarf mit den Modulen,
  die sie brauchen.
