# Überblick

Für alle, die neu im Projekt sind: Nach dieser Seite weißt du, was die Plattform ist, für wen sie gebaut
wird und wie der Baukasten funktioniert.

## Was ist die Plattform?

Eine modulare IoT-Plattform für Pharma-Abfülllinien. Sie macht Linienleistung, Alarme, Batches und
Maschinenzustand transparent – GxP-konform und ohne Eingriff in die Steuerung.

- **Ein Edge Device pro Linie** (Siemens Industrial Edge). Alle Maschinen der Linie – eigene wie fremde –
  liefern ihre Daten dorthin.
- **Kanonisches Datenmodell:** Jede Maschine wird per Mapping auf die
  [Schnittstellenspezifikation](/architektur/schnittstelle) übersetzt. Module kennen nur dieses Modell.
- **Die Plattform liest nur.** Kein Modul schreibt in eine Steuerung.

## Für wen?

| Zielgruppe                                       | Nutzen                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| Bediener, Einrichter, Instandhaltung beim Kunden | Linienzustand, Alarme, geführte Fehlersuche, Formatwechsel, Ersatzteile |
| QA und Produktionsleitung                        | Batch-Reporting mit e-Signatur, Audit Trail                             |
| Unser Service                                    | Fernzugriff, Diagnose, Verwaltung der Installation                      |
| Automatisierung                                  | Anbindung von Maschinen über Mapping und Konformitätsprüfung            |

## Die Baukasten-Idee

Ein fester **Kern** ist in jeder Installation enthalten: Shell, Datenkern, Benutzer & Audit Trail. Alles
darüber sind **Module**, die der Kunde pro Linie bucht. Ein nicht gebuchtes Modul erscheint in der
Navigation mit Schloss und zeigt einen Sperrbildschirm.

Alle Module stehen in der [Modulübersicht](/module/uebersicht).

## Weiterlesen

- [Entwicklungsumgebung einrichten](/einstieg/entwicklungsumgebung)
- [Glossar](/einstieg/glossar)
- [Architektur](/architektur/uebersicht)
