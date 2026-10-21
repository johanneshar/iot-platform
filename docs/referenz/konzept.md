# IoT-Plattform – Konzept

::: warning Kopie zur Ansicht
Verbindlich ist die Fassung in Claude Docs: <https://claude.ai/artifact/MYQkwoYHD88PCqYVRi6ekf>. Diese Kopie wurde am 2026-10-21 übernommen und wird bei Änderungen nachgezogen. Eingebettete Diagramme sind nur im Original sichtbar.
:::

Oct 21, 2026 · @Johannes

## Ausgangslage und Vision

Wir bauen eine modulare IoT-Plattform für unsere Pharma-Abfülllinien, die jeder Kunde wie einen Baukasten auf seinen Bedarf zuschneidet. Ein fester Kern ist immer dabei; alle Funktionen darüber sind einzeln buchbare Module.

- **Ziel für den Kunden:** Transparenz über Linienleistung, Alarme, Batches und Maschinenzustand – GxP-konform und ohne Eingriff in die Steuerung.
- **Ziel für uns:** Erweiterung des Produktportfolios um wiederkehrende Software-Umsätze und bessere Service-Angebote.
- **Leitprinzip:** Einmal für alle Linien entwickeln, pro Kunde nur konfigurieren – neue Maschinen und Funktionen ohne Programmieraufwand in bestehenden Modulen.

## Grundsatzentscheidungen

Drei Weichen sind gestellt; alles Weitere baut darauf auf.

| Nr. | Entscheidung | Konsequenz |
| --- | --- | --- |
| E1 | Siemens Industrial Edge ist der Plattform-Kern | Module werden als Edge Apps (Docker) entwickelt und über das Industrial Edge Management (IEM) verteilt; Datenanbindung über Siemens-Connectoren, Databus und Industrial Information Hub (IIH) |
| E2 | Ein Edge Device pro Linie | Linie ist die zentrale Betrachtungsebene (Linien-OEE, Batch über alle Maschinen, gemeinsame Zeitbasis); Edge Device trennt Liniennetz und Kundennetz |
| E3 | Fremdmaschinen werden mit eingebunden | Herstellerneutrales, kanonisches Datenmodell; jede Quelle wird per Adapter/Mapping darauf übersetzt, Apps kennen nur das Modell |

Vorgeschlagener Grundsatz (noch zu bestätigen): Das Edge Device liest nur und steuert nie. Fällt es aus, läuft die Linie unverändert weiter.

## Zielarchitektur

Die Daten aller Maschinen einer Linie laufen über Connectoren und Databus ins kanonische Linienmodell; erst darauf setzen Kern-Apps und buchbare Module auf.

&#91;embedded content: Zielarchitektur · 3 Netzebenen\]

Das Edge Device hat je einen Netzwerkport ins Liniennetz und ins Kundennetz, ohne Routing dazwischen (IEC-62443-Zonierung). Nach außen gehen nur Daten über definierte Schnittstellen; vom IEM kommen nur Apps und Updates.

## Datenmodell und Integration

Alle Maschinen – eigene wie fremde – werden in ein einheitliches Linienmodell übersetzt; die Apps arbeiten ausschließlich darauf.

**Kanonisches Modell**

- Hierarchie: Linie → Maschine → Modul/Station
- Datenklassen: Zustand (PackML), Zähler (gut/schlecht), Alarme, Prozesswerte, Batch- und Rezeptkontext
- Orientierung an PackML-Tags (OMAC / ISA-TR88), damit Fremdhersteller anschlussfähig sind
- Jeder Datenpunkt führt Quelle, Quellzeitstempel und Qualitätsstatus mit

**Eigene Maschinen:** Anbindung über den IIoT-Datenbaustein (S7-1500, separater Export-DB über OPC UA). Seine Konfigurationstabelle für Namen und Einheiten ist die Basis für das Asset-Modell im IIH.

**Fremdmaschinen:** Anbindung über den passenden Connector (OPC UA, S7, Rockwell, Modbus …) und Mapping im Common Configurator. Eine neue Fremdmaschine bedeutet eine neue Mapping-Konfiguration, keinen neuen Code.

**Integrationsstufen für Fremdmaschinen**

| Stufe | Umfang | Ermöglicht |
| --- | --- | --- |
| Basis | Betriebszustand, Gut-/Schlechtzähler, Sammelstörung | Linien-OEE, Engpassanalyse |
| Standard | + PackML-Zustände, Einzelalarme, wichtigste Prozesswerte | Alarm-Analytics, Linienzustand |
| Voll | + Batchdaten, Rezeptkontext, GxP-relevante Werte mit Quellzeitstempel | Batch-Reporting über die ganze Linie |

**Datenschnittstellenspezifikation (Vorschlag):** Wir definieren eine eigene Spezifikation (OPC-UA-Server, PackML-Tags, Alarmformat), die in die Lastenhefte für Fremdmaschinen aufgenommen wird. Für modulare Prozessanlagen wird zusätzlich MTP (VDI 2658) geprüft.

## Modulkatalog (Baukasten)

Der Kern ist bei jeder Installation dabei; die Funktionsmodule sind einzeln buchbar. Der Katalog ist ein erster Entwurf und wird gegen die Siemens-Standard-Apps (z. B. Performance Insight, Machine Insight) abgeglichen: Wir bauen nur, was pharmaspezifisches Wissen braucht.

| Modul | Art | Inhalt | GxP-relevant |
| --- | --- | --- | --- |
| Datenkern | Kern | Connectoren, Databus, IIH-Asset-Modell, kanonisches Linienmodell, Pufferung | ja (Datenquelle) |
| Benutzer & Audit Trail | Kern | Rollen, Anmeldung, unveränderbarer Audit Trail, Zeitsynchronisation | ja |
| Linien-Dashboard | Modul | PackML-Zustand je Maschine und Linie, Linien-OEE, Engpassanalyse | nein |
| Alarm-Analytics | Modul | Auswertung des eigenen Alarmsystems: Häufigkeit, Dauer, Top-Störungen | nein |
| Batch-Reporting | Modul | Batchdaten über die ganze Linie, Report, elektronische Signatur | ja |
| Condition Monitoring | Modul | Pumpen, Servos, Verschleißteile; Prognosen | nein |
| Remote-Service | Modul | Sicherer Fernzugriff und Diagnose durch unseren Service | prüfen |
| Energie-Monitoring | Modul | Verbräuche je Maschine und Linie | nein |
| Integration MES/ERP | Integration | Datenabgabe an MES, SAP, LIMS, Kunden-Historian über REST/GraphQL/OPC UA | je nach Daten |
| Datenexport | Integration | Kunden-Datenzugriff gemäß EU Data Act | nein |

Die Trennung nach GxP-Relevanz hält den Validierungsaufwand klein: Nur die markierten Module brauchen den vollen GAMP-5-Nachweis.

## Regulatorik und GxP

CRA, Maschinenverordnung und Data Act betreffen die Plattform direkt; Security und Updatefähigkeit müssen ab dem ersten Release eingebaut sein.

| Regelwerk | Stichtag | Bedeutung für die Plattform |
| --- | --- | --- |
| Cyber Resilience Act (EU 2024/2847) | Meldepflichten seit 11.09.2026, voll anwendbar ab 11.12.2027 | Secure by Design, SBOM, Schwachstellenmanagement und Security-Updates über den gesamten Lebenszyklus, Meldung aktiv ausgenutzter Schwachstellen binnen 24 h |
| Maschinenverordnung (EU 2023/1230) | ab 20.01.2027 | Cybersicherheitsnachweise in der technischen Dokumentation (Anhang III, 1.1.9) |
| EU Data Act | Access by Design für vernetzte Produkte | Kunden müssen technisch auf die erzeugten Daten zugreifen können → Datenexport-Modul |
| 21 CFR Part 11 / EU GMP Annex 11 | gilt | Audit Trail, elektronische Signaturen, Zugriffskontrolle, Datenintegrität nach ALCOA+ |
| GAMP 5 | gilt | Validierungsansatz je Modul; Lieferantennachweis von Siemens früh anfragen |
| IEC 62443 | Norm | Zonen und Conduits: Edge Device als Grenze zwischen Liniennetz und Kundennetz; Grundlage für CRA-Nachweise |

**Konsequenzen für GxP-Daten**

- Saubere Zeitsynchronisation (NTP/PTP) aller Steuerungen und des Edge Device
- Erkennung und Dokumentation von Datenlücken bei Ausfall des Edge Device
- App-Updates nur unter Change Control des Kunden
- Datenintegrität an der Quelle bei Fremdmaschinen vertraglich beim Fremdhersteller

Quellen: [produktion.de – EU-Regulierung 2026/27](https://www.produktion.de/wirtschaft/euregulierung-warum-industrieunternehmen-jetzt-genau-hinschauen/2625984), [borncity – Maschinenverordnung](https://borncity.com/news/eu-maschinenverordnung-cybersicherheit-ab-januar-2027-pflicht/), [produktion.de – CRA Vorbereitung](https://www.produktion.de/technik/cyber-resilience-act-wie-firmen-sich-vorbereiten-koennen/1676656)

## Offene Punkte und nächste Schritte

Die wichtigste offene Frage ist der Betrieb des IEM, weil daran Update-Strategie, Fernzugriff und CRA-Pflichten hängen.

**Offene Entscheidungen**

- [ ] IEM-Betrieb: beim Kunden, zentral bei uns oder beides?
- [ ] Lizenzmodell für eigene Module (pro Linie, Abo, Feature-Freischaltung); Vertrieb über Siemens-Marketplace als App-Publisher?
- [ ] Rockwell-Anbindung: verfügbaren Connector prüfen, sonst OPC UA (z. B. FactoryTalk Linx Gateway)
- [ ] Grundsatz „Edge liest nur“ bestätigen; Rückschreiben höchstens als freigeschaltetes Modul?
- [ ] Hardware-Varianten des Edge Device je Linienumfang und Abtastraten
- [ ] Retrofit: Sollen Bestandslinien ohne IIoT-Datenbaustein angebunden werden?
- [ ] Konzept für Datenlücken bei Ausfall (Puffer in Steuerung oder Export-DB)

**Nächste Schritte**

1. Kanonisches Linienmodell und Namenskonvention festlegen (Basis für alle Apps)
2. Datenschnittstellenspezifikation für Fremdmaschinen entwerfen
3. Siemens-Standard-Apps gegen den Modulkatalog abgleichen (Build vs. Buy je Modul)
4. GAMP-5-Lieferantennachweis bei Siemens anfragen
5. Proof of Concept: eine Linie mit eigener Maschine + einer Fremdmaschine, Linien-Dashboard als erstes Modul
