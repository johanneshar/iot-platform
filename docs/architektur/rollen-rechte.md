# Rollen und Rechte

Für Projektleitung, Validierung und Entwicklung: Diese Seite legt fest, welche Rolle was in der Plattform
darf. Sie ist die Grundlage der Rechteprüfung ab M3b.

::: warning Vorschlag vom 2026-10-22 – zur Bestätigung (O-05)
Die Fragen am Ende der Seite sind offen.
:::

## Rollen

| Rolle       | Wer                                                             |
| ----------- | --------------------------------------------------------------- |
| Operator    | Bedienung an der Linie                                          |
| Maintenance | Instandhaltung                                                  |
| Setup Man   | Einrichter, z. B. Formatwechsel                                 |
| Admin       | Administrator des Kunden; bucht als Einziger Module (E-14)      |
| IT Admin    | IT des Kunden: Benutzer, LDAP, Netzwerk, Schnittstellen         |
| Service     | Unser Hersteller-Zugang, in jeder Installation vorhanden (E-12) |

## Rechte je Rolle

● = darf, leer = darf nicht. Lesen der eigenen Linie (Dashboard, Alarme, Batch-Verlauf, Energie) dürfen alle
Rollen und steht deshalb nicht einzeln in der Tabelle.

| Recht                         | Bedeutung                                         | Operator | Maintenance | Setup Man | Admin | IT Admin | Service |
| ----------------------------- | ------------------------------------------------- | :------: | :---------: | :-------: | :---: | :------: | :-----: |
| `core.modules.book`           | Module im Baukasten buchen und abbestellen        |          |             |           |   ●   |          |    ●    |
| `core.users.manage`           | lokale Benutzer anlegen, Rollen zuweisen          |          |             |           |   ●   |    ●     |    ●    |
| `core.ldap.configure`         | LDAP-Anbindung einrichten                         |          |             |           |       |    ●     |    ●    |
| `core.line.configure`         | Linienkonfiguration, Schichtmodell (S-05)         |          |             |           |   ●   |          |    ●    |
| `core.audit.view`             | Audit Trail einsehen und exportieren              |          |             |           |   ●   |          |    ●    |
| `alarms.acknowledge`          | Alarme quittieren                                 |    ●     |      ●      |     ●     |   ●   |          |    ●    |
| `troubleshooting.use`         | geführte Fehlersuche durchlaufen                  |    ●     |      ●      |     ●     |   ●   |          |    ●    |
| `troubleshooting.document`    | Lösung dokumentieren                              |          |      ●      |     ●     |       |          |    ●    |
| `batch.sign`                  | Batchbericht signieren (Freigabe)                 |          |             |           |   ●   |          |         |
| `batch.export`                | Batchbericht als PDF exportieren                  |          |             |           |   ●   |          |    ●    |
| `format.execute`              | Formatwechsel durchführen und Schritte bestätigen |          |             |     ●     |       |          |    ●    |
| `format.sign`                 | Formatwechsel abschließen (e-Signatur)            |          |             |     ●     |       |          |         |
| `format.configure`            | Formatwechsel-Abläufe je Format einrichten (E-15) |          |             |           |   ●   |          |    ●    |
| `spares.view`                 | Ersatzteilkatalog einsehen                        |    ●     |      ●      |     ●     |   ●   |          |    ●    |
| `spares.request`              | Anfrage an den Service senden                     |          |      ●      |     ●     |   ●   |          |    ●    |
| `condition-monitoring.view`   | Zustand der Komponenten einsehen                  |          |      ●      |     ●     |   ●   |          |    ●    |
| `predictive-maintenance.plan` | Maßnahme in ein Wartungsfenster einplanen         |          |      ●      |           |   ●   |          |    ●    |
| `remote-service.allow`        | Fernzugriff für den Service freigeben             |          |             |           |   ●   |    ●     |         |
| `remote-service.connect`      | Fernzugriff nutzen                                |          |             |           |       |          |    ●    |
| `mes-integration.configure`   | Schnittstellen zu MES/ERP/LIMS einrichten         |          |             |           |       |    ●     |    ●    |
| `data-export.export`          | Daten exportieren (Data Act)                      |          |             |           |   ●   |    ●     |    ●    |

## Grundsätze des Vorschlags

- **GxP-Signaturen nur durch Kundenpersonal:** `batch.sign` und `format.sign` hat der Service bewusst
  nicht. Eine e-Signatur nach 21 CFR Part 11 drückt die Verantwortung einer Person des Kunden aus.
- **Fernzugriff nur mit Freigabe:** Der Service kann den Fernzugriff nutzen, aber nicht selbst freigeben.
- **Trennung IT und Betrieb:** IT Admin richtet Benutzer und Schnittstellen ein, bucht aber keine Module.
- Jede Rechteänderung und jede Anmeldung wird im Audit Trail erfasst.

## Offene Fragen

1. **QA fehlt als Rolle.** Im Mockup erteilt „[QA]“ die Linienfreigabe per e-Signatur. Wer signiert den
   Batchbericht? Vorschlag: eigene Rolle **QA** mit `batch.sign` statt Admin.
2. **Service und GxP-Signaturen:** Bleibt es dabei, dass der Service nicht signieren darf, obwohl er sonst
   „alle Rechte“ hat (E-12)?
3. **Mehrere Rollen je Benutzer:** Darf ein Benutzer mehrere Rollen haben (z. B. Maintenance und Setup Man)?
   Vorschlag: ja, die Rechte addieren sich.
