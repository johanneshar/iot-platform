# GxP

Für Entwicklung und Validierung: Diese Seite fasst zusammen, wie die Plattform Benutzer, Audit Trail und
elektronische Signaturen umsetzt und was davon für die Validierung beim Kunden wichtig ist.

## Umsetzung

| Anforderung (21 CFR Part 11 / Annex 11)       | Umsetzung                                                                                                        |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Eindeutige Benutzer, Zugriffskontrolle        | Anmeldung am Core, Rechte je Rolle aus `config/roles.json`, serverseitig geprüft                                 |
| Schutz vor Ausprobieren von Passwörtern       | Sperre nach 5 Fehlversuchen für 15 Minuten, im Audit Trail erfasst                                               |
| Audit Trail: wer, was, wann, alt → neu, warum | zentral im Core; Benutzer und UTC-Zeit setzt der Core                                                            |
| Audit Trail unveränderbar                     | nur Anhängen, Trigger gegen Ändern und Löschen, Hash-Kette mit Prüfung                                           |
| e-Signatur mit zwei Merkmalen                 | erneute Eingabe von Benutzer und Passwort, Bedeutung Pflicht, nur eigene Zugangsdaten                            |
| Signatur mit Datensatz verknüpft              | Eintrag im Audit Trail mit Vorgang, Bedeutung, Benutzer und Zeit                                                 |
| Signatur an den Inhalt gebunden (§ 11.70)     | Batchbericht eingefroren, SHA-256 als signierter Wert, Bezug `batch:<id>` ([ADR-011](/adr/ADR-011-batchbericht)) |
| Vier-Augen-Prinzip                            | „Geprüft“ und „Freigabe“ durch verschiedene Personen, vom Modul-Backend erzwungen (E-41)                         |
| Langzeitarchivierung                          | Batchbericht als PDF/A-2b mit eingebetteter Schrift (E-44)                                                       |

Details: [ADR-004](/adr/ADR-004-anmeldung-audit-signatur).

## Für Module

- GxP-relevante Vorgänge über `useAudit().record({ action, oldValue, newValue, reason })`.
- Signaturen über `useRequestSignature()({ meaning, permission, action, subject })`; der Dialog kommt von der
  Shell, das Ergebnis enthält die laufende Nummer im Audit Trail.
- Kein Modul führt einen eigenen Audit Trail.
- **Zeitstempel** werden in UTC gespeichert und in der Zeitzone des Standorts angezeigt.
- Datenqualität `bad`/`uncertain` wird sichtbar markiert, nie verschluckt.

## Hinweise für die Validierung

- **Service mit allen Rechten:** Unser Service-Zugang darf auch GxP-relevant signieren (entschieden
  2026-10-22). Jede Signatur ist dem einzelnen Service-Benutzer zugeordnet. Ob das im Validierungskonzept des
  Kunden trägt, bewertet der Kunde.
- **Beispielbenutzer** gibt es nur in der Entwicklung; im Betrieb verweigert der Core sie.
- Offen: Passwortregeln und Inaktivitätsabmeldung (O-20), Sicherung und Export des Audit Trail als Datei,
  Validierung des PDF/A mit veraPDF (O-32).

## Validierung

GxP-relevante Module (Manifest `gxp: true`) brauchen den vollen GAMP-5-Nachweis, alle anderen nicht.
Die Zuordnung steht in der [Modulübersicht](/module/uebersicht).
