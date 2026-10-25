# ADR-013: Formatwechsel und Ersatzteilkatalog

Status: angenommen
Datum: 2026-10-25

## Kontext

M7 bringt den geführten Formatwechsel (GxP) und den Ersatzteilkatalog. Offen waren das Format der Abläufe
(E-15: je Format in der Plattform eingerichtet), die Prüfung der Formatteile (E-17: Code am Teil und am
Einbauplatz), die Unterschriften (Vier-Augen-Prinzip, E-50) und die Mindeststufen (O-07). Die Plattform liest
nur: Sie lädt kein Rezept in die Steuerung und stoppt keine Maschine. Die Schnittstelle meldet das Rezept nur
in Batch-Meldungen (`batch.recipe`, `batch.formatParts`).

## Entscheidung

1. **Ablauf als JSON-Dokument** (`modules/format/schemas/format-procedure.schema.json`): `id`, `version`,
   Ausgangs- und Zielformat mit Rezept (`id`, `version`), Vorgabezeit, Schritte mit Maschine (`machineId` oder
   `null` für die Linie), Text, optional Formatteil (`id` = Teilenummer, `slot` = Code am Einbauplatz) und
   automatische Prüfung `line-stopped`. Abläufe sind versioniert; eine neue Version richtet ein Benutzer mit
   `format.configure` als Datei ein (Audit-Eintrag `format.procedure-imported`). Mitgeliefert wird der Ablauf
   aus `packages/simulator/fixtures/format-procedures/`.
2. **Jeder Schritt im Audit Trail:** Bestätigen, Zurücknehmen und Abbrechen gehen über `useAudit().record`;
   das Backend prüft den Eintrag wie beim Batch (ADR-011): Vorgang, Benutzer, Recht, Bezug `format:<id>`,
   neuer Wert, Alter ≤ 10 min. Der neue Wert eines Schritts mit Formatteil enthält beide Codes und die Quelle
   (`scanner`/`manual`, erkannt am Tippabstand des Handscanners).
3. **Prüfungen im Backend:** Reihenfolge der Schritte, Codes am Teil und am Einbauplatz, „Linie leerfahren“
   erst, wenn alle Maschinen `Stopped` melden. Fremdmaschinen bestätigt der Bediener nach Herstelleranleitung.
4. **Zwei Signaturen (E-50):** „Durchgeführt“ (`format.sign`, Setup Man) und „Freigabe“ (`format.release`,
   QA) durch verschiedene Personen – auch Service kann nicht beides. Beide Signaturen tragen den Hash des
   Protokolls (kanonisches JSON aus Ablauf, Start und allen bestätigten Schritten).
5. **Rezeptprüfung beim Batchstart:** Das aktuelle Format der Linie ist das Zielformat des letzten
   freigegebenen Wechsels, sonst das Format zum Rezept des letzten Batches. Beim ersten Batchstart nach der
   Freigabe vergleicht das Modul `batch.recipe` aller Maschinen mit dem Zielrezept und zeigt das Ergebnis.
6. **Ersatzteilkatalog als Datei** bis zur PLM-Anbindung (O-02), Schema
   `modules/spares/schemas/catalog.schema.json`; Teile sind Maschinen zugeordnet. Anfragen an den Service
   landen in einem Postausgang mit Vorgangsnummer `ANF-<Jahr>-<Nr.>`, Maschine, Seriennummer und Zustand, bis
   das Ticketsystem angebunden ist (O-03).
7. **Mindeststufen (O-07):** beide Module `basic`. Der Formatwechsel braucht nur den Zustand; die
   Rezeptprüfung nutzt `batch` (Stufe `full`) und entfällt bei Maschinen ohne Batch-Meldung. Der
   Ersatzteilkatalog braucht nur die Identität und ist `ownMachinesOnly`.
8. **Simulator:** spielt die Bedienung am HMI nach – `pnpm sim stop|start|recipe <id>` über das Topic
   `sim/v1/{lineId}/control`, außerhalb der Schnittstelle `iot/v1` und nur in der Entwicklung (E-51).

## Alternativen

- **Ablauf als Formular-Editor in der Oberfläche:** komfortabler, aber groß; die Datei mit Schema reicht, bis
  Kunden Abläufe selbst pflegen (O-36).
- **Rezept vor Ort prüfen:** bräuchte ein Datenfeld „aktuelles Rezept“ außerhalb des Batches – eine
  Schemaänderung (O-34).
- **Eigene Konformitätsstufe „Identität“** für den Katalog: zusätzlicher Begriff ohne Nutzen, `basic`
  enthält die Identität.

## Konsequenzen

- Neue Rechte `format.release` (QA) in `roles.json`; neue Komponenten `PartCard` und `ScanInput` in `@iot/ui`.
- Ein Formatwechsel ist ohne laufende Linie nicht vorführbar: im Simulator mit `pnpm sim stop`.
- Sollwerte des Rezepts vergleicht die Plattform nicht – die Schnittstelle liefert sie nicht (O-34).
