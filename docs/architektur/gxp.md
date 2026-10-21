# GxP

Für Entwicklung und Validierung: Diese Seite fasst zusammen, wie die Plattform Audit Trail,
elektronische Signaturen und Validierung umsetzt.

## Grundsätze

- Der **Audit Trail** wird zentral im Core geführt. Kein Modul schreibt einen eigenen.
- GxP-relevante Aktionen (Signatur, Parameteränderung, Formatwechsel-Abschluss) gehen über
  `audit.record()` und `requestSignature()` des `module-sdk`.
- **e-Signatur:** erneute Eingabe von Benutzer und Passwort, Pflichtangabe der Bedeutung (z. B. „Freigabe“),
  Eintrag im Audit Trail.
- **Zeitstempel** werden in UTC gespeichert und in der Zeitzone des Maschinenstandorts angezeigt.
- Datenqualität `bad`/`uncertain` wird sichtbar markiert, nie verschluckt.

## Validierung

GxP-relevante Module (Manifest `gxp: true`) brauchen den vollen GAMP-5-Nachweis, alle anderen nicht.
Die Zuordnung steht in der [Modulübersicht](/module/uebersicht).

::: info Stand M0
Details zu Audit-API und Signatur folgen mit M3 und M6.
:::
