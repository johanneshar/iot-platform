# ADR-009: Verlauf und Auswertungen im Dashboard-Modul

Status: angenommen
Datum: 2026-10-22

## Kontext

Die Maschinen-Detailseite (A-01.5, E-37) wertet Zeiträume aus, die der Kunde einstellt – von wenigen Minuten
bis zu Tagen. Der Datenkern im Core hält nur die laufende Schicht im Speicher (ADR-005, O-22). Module
sprechen nicht miteinander und lesen Maschinendaten nur über die Schnittstelle.

## Entscheidung

1. **Eigener Verlauf:** Das Dashboard-Modul abonniert die kanonischen Topics der Linie (`subscribeLine`) und
   speichert in SQLite: Zustandswechsel mit Grund, Zählerstände (letzter je Minute), Prozesswerte je Minute
   (Summe, Anzahl, Minimum, Maximum) und Alarmereignisse.
2. **Auswertung im Backend:** `GET machines/:id/analysis?period=…` rechnet Kennzahlen nach E-27 über die
   geplante Produktionszeit aus dem Schichtmodell (`plannedIntervals`), Zustandsabschnitte, Stillstände mit
   auslösendem Alarm, Leistung und Ausschuss je Abschnitt, Prozesswerte mit Grenzen aus dem Wertekatalog
   und Alarmstatistik. Zählerresets werden erkannt.
3. **Beobachtungszeitraum:** Kennzahlen gelten nur ab dem ersten gespeicherten Zählerstand im Zeitraum;
   die Seite zeigt „Daten seit …“, wenn der Verlauf später beginnt.
4. **Zeiträume (E-37):** `DASHBOARD_PERIODS`, z. B. `1h,shift,24h,7d` (`shift` = laufende Schicht, sonst
   Zahl mit `min`, `h`, `d`). Aufbewahrung = längster Zeitraum + 1 Tag. Abschnitte: bis 2 h je 5 min, bis
   2 Tage je Stunde, darüber je Tag.
5. **Linienkonfiguration:** Zeitzone und Schichtmodell holt das Modul beim Core (`GET /api/registry/line`,
   Dienst-Token; `fetchLineConfig`).

## Alternativen

- **Verlauf im Datenkern des Core:** Der Core würde Fachlogik (Auswertungen) übernehmen; CLAUDE.md
  Abschnitt 4 schließt das aus. Andere Module (Batch, Condition Monitoring) brauchen andere Verdichtungen.
- **IIH (Industrial Information Hub) als Speicher:** im Dev-Betrieb nicht verfügbar; als Quelle später
  prüfen (Spezifikation: offene Grenze Databus/IIH).
- **Rohdaten speichern:** zu groß für das Edge Device bei 7 Tagen und zyklischen Werten.

## Konsequenzen

- Nach einem Neustart sind Detailauswertungen sofort wieder da (O-22 für die Detailseite gelöst; die
  Kennzahlen der Linienübersicht rechnen weiter aus dem Datenkern).
- Alarme werden im Dashboard- und im Alarm-Modul getrennt gespeichert – jedes Modul für seinen Zweck.
- Nicht GxP-relevant: Die Auswertung dient der Produktion, nicht der Chargenfreigabe.
