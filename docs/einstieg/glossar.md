# Glossar

Für alle im Projekt: Hier stehen die Fachbegriffe, die in Code, Doku und Gesprächen vorkommen.

| Begriff                     | Bedeutung                                                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **ADR**                     | Architecture Decision Record – kurzes Dokument zu einer Architekturentscheidung, liegt in `docs/adr/`                                  |
| **ALCOA+**                  | Grundsätze der Datenintegrität: zuordenbar, lesbar, zeitgleich, original, korrekt – plus vollständig, konsistent, dauerhaft, verfügbar |
| **Audit Trail**             | Unveränderbares Protokoll GxP-relevanter Aktionen (wer, was, wann, alt → neu, Grund). Wird zentral im Core geführt                     |
| **Common Configurator**     | Siemens-Werkzeug zur Konfiguration von Connectoren und Mappings auf dem Edge Device                                                    |
| **Connector**               | Siemens Edge App, die Daten aus einer Steuerung liest (OPC UA, S7, Modbus …) und auf den Databus legt                                  |
| **Databus**                 | MQTT-Broker des Edge Device; lokal ersetzt ihn Mosquitto                                                                               |
| **Deep Link**               | Sprung in ein anderes Modul über die Shell, z. B. von der Fehlersuche zum Ersatzteil. Module sprechen nie direkt miteinander           |
| **Edge App**                | Ein Docker-basiertes Programm auf Siemens Industrial Edge; jedes Modul ist eine Edge App                                               |
| **Edge Device**             | Industrie-PC an der Linie, auf dem die Edge Apps laufen; trennt Liniennetz und Kundennetz                                              |
| **e-Signatur**              | Elektronische Unterschrift nach 21 CFR Part 11: erneute Eingabe von Benutzer und Passwort plus Bedeutung (z. B. „Freigabe“)            |
| **Fremdmaschine**           | Maschine eines anderen Herstellers in der Linie; wird per Mapping angebunden                                                           |
| **GxP**                     | Sammelbegriff für Regeln guter Praxis in der Pharmaproduktion (GMP u. a.)                                                              |
| **IEM**                     | Industrial Edge Management – verteilt Apps und Updates auf die Edge Devices und liefert den Lizenzstatus                               |
| **IIH**                     | Industrial Information Hub – Siemens-Dienst für Asset-Modell und Datenzugriff                                                          |
| **Import-Map**              | Browser-Mechanismus, über den die Shell die Oberflächen der Module lädt (siehe ADR-002)                                                |
| **JSON Schema**             | Maschinenlesbare Beschreibung der Nachrichten; verbindliche Fassung der Schnittstelle in `packages/interface-schema/schemas/`          |
| **Kanonisches Datenmodell** | Herstellerneutrales Linienmodell der Schnittstellenspezifikation; einzige Datenquelle für Module                                       |
| **Konformitätsstufe**       | Datenumfang einer Maschine: `basic`, `standard` oder `full`. Jedes Modul nennt seine Mindeststufe                                      |
| **Manifest**                | Beschreibung eines Moduls (ID, Name, Navigation, Rechte …), mit der es sich beim Core registriert                                      |
| **Normalizer**              | Edge App, die Connector-Daten anhand der Mapping-Datei auf die kanonischen Topics `iot/v1/…` abbildet                                  |
| **OEE**                     | Overall Equipment Effectiveness = Verfügbarkeit × Leistung × Qualität                                                                  |
| **PackML**                  | Standard für Maschinenzustände (ISA-TR88.00.02), z. B. `Execute`, `Held`, `Suspended`                                                  |
| **Sammelstörung**           | Einzige Alarminformation der Stufe `basic`: `alarmId` `COMMON-FAULT` – die Maschine hat eine Störung, ohne Meldungstext                |
| **SBOM**                    | Software Bill of Materials – Liste aller Abhängigkeiten, gefordert vom Cyber Resilience Act                                            |
| **Simulator**               | Erzeugt die Daten der Beispiellinien aus dem Mockup über MQTT, damit ohne Maschine entwickelt werden kann                              |
| **Sperrbildschirm**         | Anzeige der Shell für ein Modul, das auf dieser Linie nicht gebucht ist                                                                |
