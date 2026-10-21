# Simulator nutzen

Für Entwicklerinnen und Entwickler: Nach dieser Anleitung laufen die Daten von Linie 1 (Vials) und Linie 2
(Spritzen) aus dem Mockup über MQTT – ohne Maschine und ohne Edge Device.

## Starten

1. **Docker Desktop starten** und dann

   ```bash
   pnpm dev
   ```

   _Ergebnis:_ Mosquitto läuft auf Port 1883, der Simulator meldet
   `Simulator: verbunden mit mqtt://localhost:1883, sende Linie 1 · Vials und Linie 2 · Spritzen`.
   Läuft kein Broker, versucht er es alle 5 s erneut.

2. **Daten mitlesen** (optional, mit einem MQTT-Client)

   ```bash
   docker exec -it iot-dev-mosquitto-1 mosquitto_sub -t 'iot/v1/#' -v
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

| Thema                      | Annahme                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| Standort und Zeitzone      | `Europe/Berlin`                                                                                          |
| Rücksetzen der Zähler      | Schichtbeginn 06:00 („Schicht seit 06:00“); Füllmaschinen: Batchstart                                    |
| Sollleistung je Maschine   | Sollleistung der Linie aus „286 von 320 /min“ bzw. „348 von 400 /min“                                    |
| Schlechtzähler             | Füllmaschinen aus den Batchdaten; Inspektion und Etikettierer aus der Ausschussquote; Waschmaschine 0    |
| `alarmId` und `textKey`    | im Simulator festgelegt (z. B. `FILL-CAP-0001`); `FILL-WGT-0003` stammt aus der Spezifikation            |
| Vergangene Alarme          | kommen und gehen zur selben Uhrzeit (Dauer unbekannt); Quittierung durch „[Bediener]“ nur bei Stufe full |
| Schlüssel der Prozesswerte | aus den Beschriftungen abgeleitet, z. B. „Wassertemperatur“ → `waterTemperature`                         |
| GxP-Kennzeichnung          | nur Füllgewicht/-volumen und Standardabweichung (offen: O-16)                                            |
| Hersteller, Seriennummer   | Platzhalter „[Hersteller]“, „[Seriennummer]“                                                             |
| Rezept Linie 2             | `syringe-1ml`, Version 5, ohne Formatteile                                                               |
| Betriebsart                | immer `Production`                                                                                       |

## Einschränkungen

- Alarm- und Batch-Ereignisse sind nicht retained. Wer sich später verbindet, sieht sie erst nach einem
  Neustart des Simulators.
- Die Werte ändern sich nicht. Dynamik (Rauschen, Zustandswechsel, neue Alarme) kommt bei Bedarf mit den
  Modulen, die sie brauchen.
