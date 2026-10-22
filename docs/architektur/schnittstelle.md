# Schnittstelle Maschinendaten

Für Plattform und Automatisierung: Diese Seite erklärt, wie Maschinendaten auf dem Edge Device ankommen, wo
die verbindliche Fassung liegt und wie man Nachrichten im Code prüft.

## Verbindliche Quellen

1. **Schemas (maschinenlesbar):** `packages/interface-schema/schemas/*.schema.json` – die einzige verbindliche
   Quelle für die Struktur der Nachrichten ([ADR-003](/adr/ADR-003-schnittstelle-v0-2)).
2. **Spezifikation (Text):** _Schnittstellenspezifikation Maschinendaten_ in Claude Docs, Entwurf 0.4; eine
   Kopie liegt unter [Referenz](/referenz/schnittstellenspezifikation).

## Kurzfassung

- Topics: `iot/v1/{lineId}/{machineId}/{identity|meta|state|counters|alarms|activeAlarms|values|batch}`
- Retained: `identity`, `meta`, `state`, `counters`, `activeAlarms`, `batch` (Entwurf 0.4, [ADR-012](/adr/ADR-012-retained-alarme-batch))
- Umschlag: `schema` (z. B. `iot.state/1.0`), `machineId`, `ts` (Quelle, UTC), `tsEdge`, `quality`, `data`
- Konformitätsstufen `basic`, `standard`, `full`; jedes Modul nennt seine Mindeststufe

| Datenklasse      | Inhalt                                                                             | Stufe       |
| ---------------- | ---------------------------------------------------------------------------------- | ----------- |
| `identity`       | Typ, Hersteller, Position, Stufe, Sollleistung                                     | alle        |
| `state`          | PackML-Zustand, Betriebsart, Grund                                                 | alle        |
| `counters`       | gut, gesamt (ab standard: schlecht), Rücksetzzeitpunkt                             | alle        |
| `alarms`         | basic: nur `COMMON-FAULT`; ab standard Einzelalarme mit Text; full mit Quittierung | alle        |
| `activeAlarms`   | Stand der anstehenden Alarme, bei jeder Änderung vollständig (retained)            | alle        |
| `meta`, `values` | Katalog und Werte der Prozessgrößen                                                | ab standard |
| `batch`          | Batch- und Rezeptereignisse mit Start, Produktname, optional Sollmenge (retained)  | full        |

## Im Code verwenden

```ts
import { parseTopic, validateMessage } from '@iot/interface-schema';

const parsed = parseTopic(topic); // { lineId, machineId, dataClass } oder null
if (parsed) {
  const result = validateMessage(parsed.dataClass, JSON.parse(payload));
  if (!result.valid) console.warn(result.errors);
}
```

Module greifen nicht direkt auf MQTT zu, sondern über das `module-sdk` (ab M3). Testdaten liefert der
[Simulator](/anleitungen/simulator).

## Änderungen

Ändert sich die Spezifikation, wird zuerst `packages/interface-schema` angepasst
(`pnpm --filter @iot/interface-schema generate` erzeugt die Typen neu), dann der Simulator, dann die
Module. Jede Schemaänderung braucht ein ADR und wird im Text der Spezifikation nachgezogen.
