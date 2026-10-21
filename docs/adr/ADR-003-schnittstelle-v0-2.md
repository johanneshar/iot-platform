# ADR-003: Schnittstelle Maschinendaten – Entwurf 0.2 und JSON Schemas

Status: angenommen
Datum: 2026-10-22

## Kontext

Die Schnittstellenspezifikation (Entwurf 0.1) beschreibt Topics, Umschlag und Datenklassen nur als Text und
Beispiele. Für Simulator, Normalizer, Konformitätsprüfer und Module braucht es eine maschinenlesbare,
verbindliche Fassung. Außerdem wurden am 2026-10-21/22 Änderungen beschlossen (`docs/offene-punkte.md`,
S-01 bis S-06).

## Entscheidung

1. **JSON Schema (Draft 2020-12)** in `packages/interface-schema/schemas/` ist die einzige verbindliche
   Quelle für die Struktur der Nachrichten. Daraus werden TypeScript-Typen erzeugt; `validateMessage()`
   prüft Nachrichten mit ajv.
2. Änderungen gegenüber Entwurf 0.1:

   | Nr.  | Änderung                                                                                               | Schema     |
   | ---- | ------------------------------------------------------------------------------------------------------ | ---------- |
   | S-02 | Alle Stufen dürfen alle 17 PackML-Zustände melden                                                      | `state`    |
   | S-03 | `identity.nominalRate` (Sollleistung in Stück/min) ist Pflicht                                         | `identity` |
   | S-04 | Stufe `basic` meldet Alarme nur als Sammelstörung: `alarmId` `COMMON-FAULT`, Klasse `fault`, ohne Text | `alarms`   |
   | S-05 | Die geplante Produktionszeit gehört zur Linienkonfiguration der Plattform, nicht zur Schnittstelle     | –          |
   | S-06 | `min`/`max` im `meta`-Katalog sind optional                                                            | `meta`     |

3. Präzisierungen, die der Entwurf offen ließ:
   - Zeitstempel sind RFC 3339 in UTC mit `Z`.
   - Texte sind Objekte je Sprache; Deutsch ist Pflicht, weitere Sprachen optional.
   - `user` ist bei `acknowledged` Pflicht und sonst `null`.
   - `values.value` ist immer eine Zahl; Klartext gehört in `state.reason`.
   - `counters.bad` ist ab Stufe `standard` vorhanden (Stufe `basic`: nur gut und gesamt).
4. **Versionsnummern:** Da noch keine Maschine angebunden ist, bleibt die Schemaversion `1.0`
   (`iot.state/1.0`, Topic-Wurzel `iot/v1`). Das Dokument der Spezifikation wechselt auf Entwurf 0.2.
   Ab der ersten angebundenen Maschine gilt die Versionierung der Spezifikation.

## Alternativen

- **TypeScript-Typen als Quelle:** für die Automatisierung und Fremdhersteller nicht lesbar und nicht
  sprachneutral. Verworfen.
- **Schemaversion 1.1 für die Änderungen:** S-03 ist ein neues Pflichtfeld und damit ein Bruch; formal wäre
  2.0 nötig. Ohne angebundene Maschinen bringt das nur Aufwand. Verworfen.

## Konsequenzen

- Der Text der Spezifikation in Claude Docs muss mit den Schemas übereinstimmen; bei Widerspruch gilt das
  Schema, und der Text wird nachgezogen.
- Simulator und Tests prüfen jede erzeugte Nachricht gegen die Schemas.
- Prüfungen über mehrere Nachrichten (Zähler monoton, `values`-Schlüssel im `meta`-Katalog, Alarm kommt und
  geht, Pflicht-Topics je Stufe) gehören in den Konformitätsprüfer (M9), nicht in das Schema.
