# Schnittstellenspezifikation Maschinendaten (Entwurf)

::: warning Kopie zur Ansicht
Verbindlich ist die Fassung in Claude Docs: <https://claude.ai/artifact/CD4cdHpGA6wZkm5tfSJDE8>. Diese Kopie entspricht Entwurf 0.3 vom 2026-10-22 und wird bei Änderungen nachgezogen. Eingebettete Diagramme sind nur im Original sichtbar.
:::

Oct 21, 2026 · @Johannes

## Zweck und Geltungsbereich

Diese Spezifikation ist der Vertrag zwischen Automatisierung und Plattform: Jede Maschine, die ihre Daten in dieser Form liefert, funktioniert mit allen Modulen der IoT-Plattform – ohne maschinenspezifische Anpassung in der Plattform.

- **Gilt für:** alle neuen eigenen Maschinen, nachgerüstete Bestandsmaschinen und Fremdmaschinen in einer Linie
- **Regelt:** welche Daten in welcher Struktur, mit welchen Metadaten und in welcher Qualität auf dem Edge Device ankommen
- **Regelt nicht:** wie die Daten in der Steuerung erzeugt werden (Sache der Automatisierung) und wie die Module sie darstellen (Sache der Plattform)
- **Status:** Entwurf, Version 0.3 (Stand 2026-10-22) – zur Abstimmung mit der Automatisierung; Änderungen gegenüber 0.1 im Abschnitt „Änderungen seit Entwurf 0.1“

## Verantwortlichkeiten und Schnittstellengrenze

Die Grenze liegt auf dem Edge Device: Die Automatisierung liefert Daten samt Mapping, die Plattform normalisiert sie und entwickelt alle Module ausschließlich gegen die standardisierten Topics.

&#91;embedded content: Schnittstellengrenze · Automatisierung und Plattform\]

| Aufgabe | Automatisierung | Plattform |
| --- | --- | --- |
| Daten in der Steuerung bereitstellen (IIoT-Datenbaustein, Retrofit-Baustein) | verantwortlich | berät |
| Connector-Konfiguration und Mapping-Datei je Maschinentyp | verantwortlich | stellt Vorlage bereit |
| Normalizer, JSON Schemas, Simulator, Prüfwerkzeug | nutzt | verantwortlich |
| Konformitätsprüfung bei Inbetriebnahme | führt durch | stellt Werkzeug |
| Module | – | verantwortlich |

## Konformitätsstufen

Jede Maschine erfüllt eine von drei Stufen; jedes Modul nennt die Mindeststufe, die es braucht. Neue eigene Maschinen erfüllen immer „Voll“.

| Datenklasse | Basis | Standard | Voll |
| --- | --- | --- | --- |
| Identität | Pflicht | Pflicht | Pflicht |
| Zustand | PackML-State und Mode | PackML-State und Mode | PackML-State und Mode |
| Zähler | Gut, Gesamt | Gut, Schlecht, Gesamt | Gut, Schlecht, Gesamt |
| Alarme | Sammelstörung (COMMON-FAULT, ohne Text) | Einzelalarme mit Klasse und Text | Einzelalarme inkl. Quittierung und Benutzer |
| Prozesswerte | – | Ausgewählte Werte mit Metadaten | Alle GxP-relevanten Werte mit Metadaten |
| Batch und Rezept | – | – | Pflicht |

**Mindeststufe je Modul (Vorschlag)**

| Modul | Mindeststufe |
| --- | --- |
| Linien-Dashboard (OEE, Engpass) | Basis |
| Alarm-Analytics | Standard |
| Geführte Fehlersuche | Standard |
| Condition Monitoring / Predictive Maintenance | Voll (nur eigene Maschinen) |
| Batch-Reporting | Voll |
| Geführter Formatwechsel | Voll (eigene Maschinen), Basis (Fremdmaschinen: nur Bestätigung) |
| Ersatzteilkatalog | Identität (nur eigene Maschinen) |

## Transport

Die Daten liegen auf dem Databus des Edge Device als MQTT-Topics in einer festen Struktur; jede Nachricht hat denselben Umschlag.

**Topic-Struktur**

```text
iot/v1/{lineId}/{machineId}/{datenklasse}
```

| Topic-Endung | Inhalt | Retained |
| --- | --- | --- |
| `identity` | Identität und Konformitätsstufe | ja |
| `meta` | Katalog der Prozesswerte (Name, Einheit, Grenzen) | ja |
| `state` | Zustand bei jeder Änderung | ja |
| `counters` | Zählerstände, zyklisch (Vorschlag 5 s) | ja |
| `alarms` | Alarmereignisse (kommt, geht, quittiert) | nein |
| `values` | Prozesswerte, zyklisch oder bei Änderung | nein |
| `batch` | Batch- und Rezeptereignisse | nein |

**IDs:** `lineId` und `machineId` sind kleingeschrieben, ohne Leerzeichen, eindeutig je Standort, z. B. `l1` und `l1-fill`. Sie ändern sich während der Lebensdauer der Maschine nicht.

**Nachrichtenumschlag (für alle Datenklassen gleich)**

```json
{
  "schema": "iot.state/1.0",
  "machineId": "l1-fill",
  "ts": "2026-10-21T12:14:03.120Z",
  "tsEdge": "2026-10-21T12:14:03.188Z",
  "quality": "good",
  "data": { }
}
```

- `schema`: Datenklasse und Schemaversion
- `ts`: Zeitstempel der Quelle (Steuerung) in UTC – maßgeblich für GxP-Daten
- `tsEdge`: Empfangszeit auf dem Edge Device, setzt der Normalizer
- `quality`: `good`, `uncertain` oder `bad` (z. B. Verbindung zur Steuerung unterbrochen)

Alle Zeitstempel sind RFC 3339 in UTC mit `Z`, z. B. `2026-10-21T12:14:03.120Z`.

## Datenklassen

Gezeigt ist jeweils nur der Inhalt von `data`; der Umschlag ist immer gleich.

**identity** – einmal beim Start und bei Änderung

```json
{
  "type": "Füll- und Verschließmaschine",
  "manufacturer": "own",
  "serial": "[Seriennummer]",
  "lineId": "l1",
  "position": 3,
  "interfaceVersion": "1.0",
  "conformance": "full",
  "nominalRate": 320,
  "source": "S7-1500 · IIoT-Datenbaustein (OPC UA)"
}
```

`manufacturer` ist `own` oder der Herstellername; `conformance` ist `basic`, `standard` oder `full`.

`nominalRate` ist die Sollleistung in Stück pro Minute und Pflicht – Grundlage der OEE-Leistung. Die geplante Produktionszeit (Schichtmodell) gehört nicht zur Maschine, sondern zur Linienkonfiguration der Plattform.

`source` ist optional: die Anbindung der Maschine im Klartext, z. B. „OPC UA · PackML-Tags“. Der Normalizer setzt sie aus der Mapping-Datei.

**state**

```json
{ "state": "Execute", "mode": "Production", "reason": null }
```

Zustände nach PackML (ISA-TR88.00.02). Alle Stufen dürfen alle 17 PackML-Zustände melden.

**counters** – kumulativ seit `resetAt`

```json
{ "good": 61880, "bad": 2580, "total": 64460, "resetAt": "2026-10-21T04:14:00Z" }
```

Stufe Basis liefert `good` und `total`; `bad` gibt es ab Stufe Standard.

**alarms** – eine Nachricht pro Ereignis

```json
{
  "alarmId": "FILL-WGT-0003",
  "event": "raised",
  "class": "fault",
  "textKey": "alarm.weighcell.tare",
  "text": { "de": "Wägezelle 3: Tara-Abweichung", "en": "Weigh cell 3: tare deviation" },
  "subsystem": "Wägung",
  "user": null
}
```

`event` ist `raised`, `cleared` oder `acknowledged` (dann mit `user`). `class` ist `fault`, `warning` oder `info`. Die `alarmId` ist stabil über alle Softwarestände – daran hängen Fehlerbäume und Auswertungen.

Stufe Basis meldet nur die Sammelstörung: `alarmId` `COMMON-FAULT`, Klasse `fault`, ohne `textKey` und `text`. Ab Stufe Standard sind `textKey` und `text` Pflicht; `text` enthält je Sprache einen Eintrag, Deutsch (`de`) ist Pflicht. `user` ist bei `acknowledged` Pflicht und sonst `null`.

**meta** – Katalog der Prozesswerte

```json
{
  "values": [
    { "key": "fillWeightAvg", "name": { "de": "Füllgewicht Ø", "en": "Fill weight avg" },
      "unit": "g", "min": 9.9, "max": 10.1, "gxp": true, "sampling": "onChange" }
  ]
}
```

`min` und `max` sind optional.

**values**

```json
{ "values": [ { "key": "fillWeightAvg", "value": 10.02 } ] }
```

Nur Schlüssel, die im `meta`-Katalog stehen, sind zulässig.

`value` ist immer eine Zahl; Klartext wie ein Stillstandsgrund gehört in `state.reason`.

**batch**

```json
{
  "event": "started",
  "batchId": "B-2026-1042",
  "recipe": { "id": "vial-10ml", "version": 3 },
  "formatParts": ["FT-2041", "FT-3110"]
}
```

`event` ist `started`, `paused`, `resumed` oder `ended`.

## Retrofit älterer Maschinen

Bestandsmaschinen werden nicht umprogrammiert, sondern über ein Mapping an die Spezifikation angepasst; für die Plattform sind sie danach nicht von neuen Maschinen zu unterscheiden.

| Weg | Wann | Aufwand Steuerung | Erreichbare Stufe |
| --- | --- | --- | --- |
| A: Nur Mapping-Datei | Daten sind über OPC UA oder S7 lesbar | keiner | Basis bis Standard, je nach vorhandenen Daten |
| B: Retrofit-Baustein in der SPS | Daten liegen verteilt, Alarme nur intern | gering (ein Baustein + Export-DB) | Standard bis Voll |
| C: Hardware-Signale | Steuerung nicht zugänglich (z. B. sehr alte oder Fremd-SPS) | Verdrahtung auf IO-Modul | Basis |

**Mapping-Datei:** Die Automatisierung liefert pro Maschinentyp und Softwarestand eine Mapping-Datei (JSON), die Quelladressen auf Datenklassen und Schlüssel dieser Spezifikation abbildet. Der Normalizer liest sie und erzeugt daraus die Topics. Mapping-Dateien werden versioniert und wiederverwendet – eine Maschine desselben Typs braucht kein neues Mapping.

**Alarme bei Bestandsmaschinen:** Alarmnummern der Maschine werden über eine Alarmtabelle auf stabile `alarmId`, Klasse und Textschlüssel abgebildet. Fehlt ein Eintrag, erscheint der Alarm als `info` mit Originaltext, damit nichts verloren geht.

## Versionierung und Konformitätsprüfung

Die Spezifikation wird nach Semantic Versioning geführt; eine Maschine gilt erst als angebunden, wenn sie die Konformitätsprüfung bestanden hat.

**Versionierung**

- Kleine Version (1.0 → 1.1): nur Ergänzungen, z. B. neue optionale Felder. Bestehende Maschinen bleiben gültig.
- Große Version (1.x → 2.0): Brüche. Die Topic-Wurzel wechselt (`iot/v2/…`), die Plattform unterstützt beide Versionen für eine Übergangszeit.
- Die Schemas liegen maschinenlesbar als JSON Schema im Plattform-Repository und sind die einzige verbindliche Quelle (packages/interface-schema/schemas/). Bis zur ersten angebundenen Maschine bleibt die Schemaversion 1.0, auch mit den Änderungen aus Entwurf 0.2.

**Konformitätsprüfung**

Die Plattform stellt ein Prüfwerkzeug bereit, das die Topics einer Maschine eine definierte Zeit mitliest und einen Prüfbericht erzeugt:

- [ ] Alle Pflicht-Topics der angegebenen Stufe vorhanden
- [ ] Alle Nachrichten schemakonform
- [ ] Zeitstempel plausibel (Abweichung Quelle zu Edge unter 1 s)
- [ ] Zähler monoton steigend bis zum Reset
- [ ] Alle `values`-Schlüssel im `meta`-Katalog enthalten
- [ ] Jeder Alarm hat Kommt und Geht

Der Prüfbericht wird Teil der Inbetriebnahmedokumentation der Maschine.

## Änderungen seit Entwurf 0.1

Entwurf 0.2 und 0.3 übernehmen die Entscheidungen vom 21. und 22.10.2026; die JSON Schemas im Plattform-Repository setzen sie um (ADR-003, ADR-006).

| Nr. | Änderung | Datenklasse |
| --- | --- | --- |
| S-02 | Alle Stufen dürfen alle 17 PackML-Zustände melden | `state` |
| S-03 | `nominalRate` (Sollleistung in Stück/min) ist Pflicht | `identity` |
| S-04 | Stufe Basis: Sammelstörung als `alarmId` `COMMON-FAULT`, Klasse `fault`, ohne Text | `alarms` |
| S-05 | Geplante Produktionszeit gehört zur Linienkonfiguration der Plattform | – |
| S-06 | `min`/`max` im Katalog sind optional | `meta` |
| – | Zeitstempel RFC 3339 in UTC mit `Z`; Texte je Sprache, Deutsch Pflicht; `value` immer Zahl | alle |
| S-07 | Optionales Feld `source`: Datenquelle der Maschine im Klartext (Entwurf 0.3) | `identity` |

## Offene Punkte

- [ ] Grenze bestätigen: Databus-Topics (dieser Entwurf) oder IIH-Asset-Modell als verbindliche Schnittstelle?
- [ ] Wer baut und pflegt den Normalizer: Plattform (Vorschlag) oder Automatisierung?
- [ ] ID-Konvention für `lineId` und `machineId` standortübergreifend festlegen
- [ ] Abtastraten für `values` je Datenklasse festlegen (Speicher- und Lastbudget des Edge Device)
- [ ] Pufferung bei Ausfall: Wie viele Stunden muss die Steuerung GxP-Daten vorhalten?
- [ ] Rückkanal: Sollen Module jemals Werte schreiben (z. B. Rezept laden)? Wenn ja, eigenes Kapitel mit Freigabekonzept
- [ ] Abgleich mit OPC UA Companion Specification für PackML und mit MTP
