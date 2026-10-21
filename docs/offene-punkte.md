# Offene Punkte

Für alle im Projekt: Hier stehen getroffene Entscheidungen, die noch nicht in einem ADR oder der
Spezifikation umgesetzt sind, und alle offenen Fragen mit Verantwortlichem und Ziel-Meilenstein.

## Entscheidungen vom 2026-10-21

| Nr.  | Thema                                    | Entscheidung                                                                                                                                                                                                                                     | Umgesetzt in                |
| ---- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| E-01 | Backend-Sprache                          | TypeScript durchgängig                                                                                                                                                                                                                           | ADR-001                     |
| E-02 | Einbindung der Modul-UIs                 | ES-Module + Import-Map                                                                                                                                                                                                                           | ADR-002 (Details M3)        |
| E-03 | Repository                               | GitHub, CI mit GitHub Actions                                                                                                                                                                                                                    | M0                          |
| E-04 | Namen                                    | Projekt `iot-platform`, npm-Scope `@iot`                                                                                                                                                                                                         | M0                          |
| E-05 | Referenzdokumente                        | Kopien unter `docs/referenz/`, verbindlich bleibt Claude Docs                                                                                                                                                                                    | M0                          |
| E-06 | Modulumfang                              | Alle 14 Bausteine aus dem Mockup werden umgesetzt                                                                                                                                                                                                | Modulübersicht, M11/M12 neu |
| E-07 | Modul-IDs                                | Namen aus `CLAUDE.md` (`alarms`, `troubleshooting`, `condition-monitoring`, `predictive-maintenance`)                                                                                                                                            | Modulübersicht              |
| E-08 | Kernbausteine                            | „Datenkern“ und „Benutzer & Audit Trail“ sind Teil von `apps/core` (+ Normalizer), kein eigenes Manifest                                                                                                                                         | M3                          |
| E-09 | Schrift und Logo                         | Vorerst Ersatzschrift und Platzhalter „[Firmenlogo]“                                                                                                                                                                                             | M1                          |
| E-10 | Sprachen                                 | de/en mit Sprachumschaltung, weitere Sprachen später ergänzbar                                                                                                                                                                                   | M0 (Grundgerüst)            |
| E-11 | Farben außerhalb der Token-Tabelle       | Werden eigene Tokens: `#cfd6d6`, `#7fb9b6`, `#00625e`, `#bfc6c6`, `#eef1f1`                                                                                                                                                                      | M1                          |
| E-12 | Benutzer                                 | Optional LDAP (wenn vom Kunden gewünscht), sonst lokale Rollen Operator, Maintenance, Setup Man, Admin, IT Admin; immer zusätzlich Hersteller-Zugang „Service“ mit allen Rechten                                                                 | M3                          |
| E-13 | e-Signatur                               | Erneute Eingabe von Benutzer und Passwort, Bedeutung als Pflichtangabe                                                                                                                                                                           | M3, M6                      |
| E-14 | Module buchen                            | Nur der Admin des Kunden; Lizenzstatus kommt vom IEM                                                                                                                                                                                             | M3                          |
| E-15 | Datenquellen außerhalb der Schnittstelle | Fehlerbäume aus separatem System; Ersatzteile aus unserem PLM; Formatwechsel-Abläufe werden pro Format in der Plattform eingerichtet (von uns oder vom Kunden); Komponenten- und Ausfallprognosen berechnet die Plattform aus den Maschinendaten | M5, M7, M8                  |
| E-16 | Ersatzteilanfrage                        | Geht an ein Ticketsystem                                                                                                                                                                                                                         | M7                          |
| E-17 | Formatwechsel-Scan                       | Handscanner (Tastatureingabe); Code am Formatteil **und** am Einbauplatz                                                                                                                                                                         | M7                          |
| E-18 | Endgeräte                                | HMI, Tablet und PC                                                                                                                                                                                                                               | M1 (responsiv, Touch)       |
| E-19 | Zeitzone                                 | Speicherung UTC, Anzeige in der Zeitzone des Maschinenstandorts                                                                                                                                                                                  | M2, M3                      |
| E-20 | Meilensteine                             | M11: MES/ERP-Integration + Datenexport; M12: Remote-Service + Energie-Monitoring                                                                                                                                                                 | `CLAUDE.md`                 |

## Beschlossene Änderungen an der Spezifikation (Umsetzung in M2) {#spec-aenderungen}

Werden in M2 per ADR in `packages/interface-schema` und in der Spezifikation in Claude Docs nachgezogen.

| Nr.  | Änderung                                                                                                    |
| ---- | ----------------------------------------------------------------------------------------------------------- |
| S-01 | Maschinen-IDs im Simulator: `l1-wash`, `l1-tunnel`, `l1-fill`, `l1-insp`, `l2-detub`, `l2-fill`, `l2-label` |
| S-02 | Auch Stufe `basic` meldet alle PackML-Zustände (bisher nur `Execute`/`Stopped`/`Aborted`)                   |
| S-03 | Sollleistung und geplante Produktionszeit werden in `identity` geliefert (Grundlage für OEE)                |
| S-04 | Stufe `basic`: Alarme nur als Sammelstörung („Maschine hat Störung“), keine Einzelmeldung                   |

## Offene Fragen

| Nr.  | Frage                                                                                                                                                                                                                                             | Wer klärt | Bis         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------- |
| O-01 | Fehlerbaum-System: welches System, welche Schnittstelle, welches Format?                                                                                                                                                                          | Johannes  | M5          |
| O-02 | PLM-Anbindung für Ersatzteile: System, Schnittstelle, Bestand und Lieferzeit verfügbar?                                                                                                                                                           | Johannes  | M7          |
| O-03 | Ticketsystem für Ersatzteilanfragen: welches System, welche API?                                                                                                                                                                                  | Johannes  | M7          |
| O-04 | LDAP: welche Verzeichnisse (AD, OpenLDAP), Gruppen-zu-Rollen-Zuordnung?                                                                                                                                                                           | Johannes  | M3          |
| O-05 | Rechte je Rolle (Matrix Rolle × Permission)                                                                                                                                                                                                       | Johannes  | M3          |
| O-06 | Lizenzstatus vom IEM: über welche Schnittstelle liest der Core ihn aus?                                                                                                                                                                           | Plattform | M3          |
| O-07 | Mindeststufe Ersatzteilkatalog („Identität“) und Formatwechsel (gemischt) passen nicht in das Manifest-Feld `minConformance` – eigene Stufe oder Sonderregel?                                                                                     | Plattform | M3          |
| O-08 | Mindeststufen für MES/ERP, Datenexport, Remote-Service, Energie-Monitoring                                                                                                                                                                        | Johannes  | M11         |
| O-09 | S-03: Ist die geplante Produktionszeit (Schichtmodell) eine Eigenschaft der Maschine oder der Linie?                                                                                                                                              | Johannes  | M2          |
| O-10 | Lizenz der Firmenschrift Helvetica Neue LT Pro für Web-Einsatz, Schriftdateien und Logo                                                                                                                                                           | Johannes  | vor Release |
| O-11 | ~~Repository auf GitHub~~ – erledigt: github.com/johanneshar/iot-platform                                                                                                                                                                         | –         | M0          |
| O-12 | Farben der übrigen PackML-Zustände (Starting, Completing, Aborted …): festgelegt sind nur Execute, Suspended, Held, Idle, Stopped; die übrigen sind vorerst neutral                                                                               | Johannes  | M4          |
| O-13 | Kontrast: Haupt-KPI-Beschriftung und Zähler im aktiven Navigationseintrag weichen vom Mockup ab, weil der Kontrast im Mockup unter 4,5:1 liegt (siehe [Design-System](/architektur/design-system#bewusste-abweichungen-vom-mockup)) – bestätigen? | Johannes  | Abnahme M1  |
| O-14 | Weitere Farben aus dem Mockup als Tokens, über die fünf aus E-11 hinaus (u. a. `#8a9190`, `#b4bcbb`, Grautöne der Seitenleiste) – bestätigen?                                                                                                     | Johannes  | Abnahme M1  |
| O-15 | Statusblock „Edge Device“: Darstellung im Zustand offline fehlt im Mockup; vorerst roter Punkt                                                                                                                                                    | Johannes  | M3          |

## Offen aus dem Konzept und der Spezifikation

Übernommen aus den [Referenzdokumenten](/referenz/konzept); Klärung außerhalb der Software-Meilensteine.

- IEM-Betrieb: beim Kunden, zentral bei uns oder beides?
- Lizenzmodell (pro Linie, Abo, Feature-Freischaltung); Vertrieb über den Siemens-Marketplace?
- Rockwell-Anbindung: verfügbarer Connector oder OPC UA
- Hardware-Varianten des Edge Device je Linienumfang und Abtastraten
- Retrofit von Bestandslinien ohne IIoT-Datenbaustein
- Konzept für Datenlücken bei Ausfall; Pufferdauer der GxP-Daten in der Steuerung
- Grenze der Schnittstelle: Databus-Topics oder IIH-Asset-Modell?
- ID-Konvention für `lineId` und `machineId` standortübergreifend
- Abtastraten für `values`
- Abgleich mit OPC UA Companion Specification für PackML und mit MTP
