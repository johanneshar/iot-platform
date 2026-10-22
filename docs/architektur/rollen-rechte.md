# Rollen und Rechte

Für Projektleitung, Validierung und Entwicklung: Diese Seite legt fest, welche Rolle was in der Plattform
darf. Sie ist die Grundlage der Rechteprüfung ab M3b.

Bestätigt am 2026-10-22 (O-05). Verbindlich ist `apps/core/backend/config/roles.json`; die Tabelle unten
ist daraus erzeugt.

## Rollen

| Rolle       | Wer                                                                               |
| ----------- | --------------------------------------------------------------------------------- |
| Operator    | Bedienung an der Linie                                                            |
| Maintenance | Instandhaltung                                                                    |
| Setup Man   | Einrichter, z. B. Formatwechsel                                                   |
| QA          | Qualitätssicherung des Kunden; signiert den Batchbericht                          |
| Admin       | Administrator des Kunden; bucht als Einziger Module (E-14)                        |
| IT Admin    | IT des Kunden: Benutzer, LDAP, Netzwerk, Schnittstellen                           |
| Service     | Unser Hersteller-Zugang mit allen Rechten, in jeder Installation vorhanden (E-12) |

Ein Benutzer kann mehrere Rollen haben; die Rechte addieren sich.

## Rechte je Rolle

● = darf, leer = darf nicht. Lesen der eigenen Linie (Dashboard, Alarme, Batch-Verlauf, Energie) dürfen alle
angemeldeten Benutzer und steht deshalb nicht einzeln in der Tabelle.

| Recht                         | Bedeutung                                         | Operator | Maintenance | Setup Man | QA  | Admin | IT Admin | Service |
| ----------------------------- | ------------------------------------------------- | :------: | :---------: | :-------: | :-: | :---: | :------: | :-----: |
| `core.modules.book`           | Module im Baukasten buchen und abbestellen        |          |             |           |     |   ●   |          |    ●    |
| `core.users.manage`           | lokale Benutzer anlegen, Rollen zuweisen          |          |             |           |     |   ●   |    ●     |    ●    |
| `core.ldap.configure`         | LDAP-Anbindung einrichten                         |          |             |           |     |       |    ●     |    ●    |
| `core.line.configure`         | Linienkonfiguration, Schichtmodell (S-05)         |          |             |           |     |   ●   |          |    ●    |
| `core.audit.view`             | Audit Trail einsehen und exportieren              |          |             |           |  ●  |   ●   |          |    ●    |
| `alarms.acknowledge`          | Alarme quittieren                                 |    ●     |      ●      |     ●     |     |   ●   |          |    ●    |
| `troubleshooting.use`         | geführte Fehlersuche durchlaufen                  |    ●     |      ●      |     ●     |     |   ●   |          |    ●    |
| `troubleshooting.document`    | Lösung dokumentieren                              |          |      ●      |     ●     |     |       |          |    ●    |
| `batch.sign`                  | Batchbericht signieren (Freigabe)                 |          |             |           |  ●  |       |          |    ●    |
| `batch.export`                | Batchbericht als PDF exportieren                  |          |             |           |  ●  |   ●   |          |    ●    |
| `format.execute`              | Formatwechsel durchführen und Schritte bestätigen |          |             |     ●     |     |       |          |    ●    |
| `format.sign`                 | Formatwechsel abschließen (e-Signatur)            |          |             |     ●     |     |       |          |    ●    |
| `format.configure`            | Formatwechsel-Abläufe je Format einrichten (E-15) |          |             |           |     |   ●   |          |    ●    |
| `spares.view`                 | Ersatzteilkatalog einsehen                        |    ●     |      ●      |     ●     |     |   ●   |          |    ●    |
| `spares.request`              | Anfrage an den Service senden                     |          |      ●      |     ●     |     |   ●   |          |    ●    |
| `condition-monitoring.view`   | Zustand der Komponenten einsehen                  |          |      ●      |     ●     |     |   ●   |          |    ●    |
| `predictive-maintenance.plan` | Maßnahme in ein Wartungsfenster einplanen         |          |      ●      |           |     |   ●   |          |    ●    |
| `remote-service.allow`        | Fernzugriff für den Service freigeben             |          |             |           |     |   ●   |    ●     |    ●    |
| `remote-service.connect`      | Fernzugriff nutzen                                |          |             |           |     |       |          |    ●    |
| `mes-integration.configure`   | Schnittstellen zu MES/ERP/LIMS einrichten         |          |             |           |     |       |    ●     |    ●    |
| `data-export.export`          | Daten exportieren (Data Act)                      |          |             |           |     |   ●   |    ●     |    ●    |

## Grundsätze

- **Service hat alle Rechte**, auch GxP-Signaturen (entschieden 2026-10-22). Jede Signatur ist im Audit
  Trail dem einzelnen Service-Benutzer zugeordnet. Ob das für die Validierung beim Kunden trägt, bewertet
  der Kunde (Hinweis für die GxP-Doku).
- **QA signiert den Batchbericht**, nicht der Admin.
- **Fernzugriff gibt der Kunde frei** (Admin oder IT Admin); der Service nutzt ihn.
- **Trennung IT und Betrieb:** IT Admin richtet Benutzer und Schnittstellen ein, bucht aber keine Module.
- Jede Anmeldung, jede Buchung und jede Signatur wird im Audit Trail erfasst.
