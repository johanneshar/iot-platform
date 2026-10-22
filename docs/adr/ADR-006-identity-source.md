# ADR-006: Optionales Feld `identity.source` (Datenquelle)

Status: angenommen
Datum: 2026-10-22

## Kontext

Das Mockup zeigt in den Maschinendetails die Datenquelle, z. B. „OPC UA · Mapping im Common Configurator“
oder „S7-1500 · IIoT-Datenbaustein (OPC UA)“. Die Schnittstelle (Entwurf 0.2) hatte dafür kein Feld (O-23).

## Entscheidung

`identity` bekommt das **optionale** Feld `source` (Text, nicht leer): die Anbindung der Maschine im Klartext.
Der Normalizer setzt es aus der Mapping-Datei; der Simulator übernimmt die Texte aus dem Mockup. Ohne Angabe
zeigt das Dashboard „—“. Änderung S-07, Spezifikation Entwurf 0.3.

## Alternativen

- **Datenquelle in der Linienkonfiguration des Core:** doppelt gepflegt neben dem Mapping.
- **Hersteller statt Datenquelle anzeigen:** weicht vom Mockup ab und sagt nichts über die Anbindung.

## Konsequenzen

- Optionales Feld: bestehende Nachrichten bleiben gültig, Schemaversion bleibt 1.0 (ADR-003).
- Die Mapping-Vorlage für die Automatisierung bekommt das Feld (M9).
