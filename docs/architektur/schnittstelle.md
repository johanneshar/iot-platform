# Schnittstelle Maschinendaten

Für Plattform und Automatisierung: Diese Seite erklärt, welche Rolle die Schnittstellenspezifikation spielt
und wo ihre verbindliche Fassung liegt.

## Verbindliche Quellen

1. **Spezifikation (Text):** _Schnittstellenspezifikation Maschinendaten_ in Claude Docs; eine Kopie liegt
   unter [Referenz](/referenz/schnittstellenspezifikation).
2. **Schemas (maschinenlesbar):** `packages/interface-schema/` – ab M2 die einzige verbindliche Quelle für
   die Struktur der Nachrichten.

## Kurzfassung

- Topics: `iot/v1/{lineId}/{machineId}/{identity|meta|state|counters|alarms|values|batch}`
- Einheitlicher Umschlag: `schema`, `machineId`, `ts` (Quelle, UTC), `tsEdge`, `quality`, `data`
- Konformitätsstufen `basic`, `standard`, `full`; jedes Modul nennt seine Mindeststufe

## Änderungen

Ändert sich die Spezifikation, wird zuerst `packages/interface-schema` angepasst, dann der Simulator, dann
die Module. Jede Schemaänderung braucht ein ADR. Bereits beschlossene Änderungen für M2 stehen in den
[offenen Punkten](/offene-punkte#spec-aenderungen).
