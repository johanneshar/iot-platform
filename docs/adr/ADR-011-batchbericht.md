# ADR-011: Batchbericht, Einfrieren und Signaturbindung

Status: angenommen
Datum: 2026-10-22

## Kontext

Das Batch-Reporting (M6, GxP-relevant) fasst die Batchdaten aller Maschinen der Linie zu einem Bericht zusammen,
den zwei Personen signieren (Vier-Augen-Prinzip, E-41). 21 CFR Part 11 / EU GMP Annex 11 verlangen, dass eine
Signatur untrennbar mit dem signierten Datensatz verbunden ist (Part 11 § 11.70), dass der Datensatz danach
nicht unbemerkt geändert werden kann und dass er langfristig lesbar bleibt (E-44: PDF/A). Die Plattform liest
nur; den Batch starten und beenden die Maschinen (Topic `batch`).

## Entscheidung

1. **Daten:** Das Modul `batch` speichert je Batch die Ereignisse aller Maschinen (Zusammenfassung über die
   `batchId`), die **Rohwerte** der GxP-relevanten Prozesswerte (`gxp: true` im Wertekatalog) mit
   Quellzeitstempel und Qualität, Zählerstände, Alarme und **Datenlücken** (mehr als 60 s ohne Nachricht einer
   Maschine). Aufbewahrung unbegrenzt (E-43).
2. **Ablauf (E-40):** Linienfreigabe (e-Signatur QA, Bedeutung „Linienfreigabe“, gilt für den nächsten Batch;
   nachträglich erteilt wird vermerkt) → Produktion → Linienräumung (Bestätigung) → Bericht wird **eingefroren**
   → „Geprüft“ (e-Signatur, `batch.review`) → „Freigabe“ (e-Signatur QA, `batch.sign`, andere Person als
   „Geprüft“).
3. **Einfrieren:** Der Bericht wird als JSON mit sortierten Schlüsseln gespeichert; sein SHA-256 ist der
   **Bericht-Hash**. Ein Datenbank-Trigger verhindert jede Änderung danach.
4. **Signaturbindung:** Beide Signaturen tragen den Bericht-Hash als `newValue` und den Bezug `batch:<id>` im
   Audit Trail des Core. Das Modul-Backend liest den Eintrag mit Dienst-Token (`GET /api/registry/audit/:seq`)
   und übernimmt den Schritt nur, wenn Vorgang, Bedeutung, Benutzer, Recht, Bezug, Hash und Alter (≤ 10 min)
   stimmen. Vier-Augen-Prinzip: Das Backend lehnt die Freigabe durch die Person ab, die geprüft hat – auch für
   den Service mit allen Rechten.
5. **Audit Trail mit Bezug:** Einträge haben ein optionales Feld `reference`. Es geht nur dann in den Hash des
   Eintrags ein, wenn es gesetzt ist; bestehende Ketten bleiben gültig. Module finden ihre Einträge über
   `GET /api/registry/audit?module=…&reference=…`.
6. **PDF/A-2b:** Das Backend erzeugt den Bericht mit pdfkit 0.20 (`subset: 'PDF/A-2b'`, XMP-Metadaten,
   Ausgabe-Farbprofil), Schrift DejaVu Sans eingebettet (freie Lizenz; Firmenschrift offen, O-10). Inhalt: Kopf,
   Bericht-Hash, Ablauf mit Signaturen und Nummern im Audit Trail, je Maschine Mengen, GxP-Werte (Anzahl,
   Minimum, Maximum, Mittel, Grenzen, Grenzverletzungen, unsicher/ungültig), Alarme, Datenlücken. Der Export wird
   im Audit Trail erfasst (`batch.report-exported`).

## Alternativen

- **Signatur ohne Hash, nur mit Batchnummer:** Änderungen am Bericht nach der Signatur wären nicht erkennbar.
- **PDF im Browser drucken:** kein PDF/A, kein reproduzierbares Layout.
- **Bericht live berechnen statt einfrieren:** spätere Daten (z. B. nachgelieferte Werte) würden einen signierten
  Bericht verändern.
- **Maschinen-Audit-Trails übernehmen:** nicht Teil der Schnittstelle (O-30).

## Konsequenzen

- Prüfbar: Hash des Berichts neu berechnen und mit den Signaturen im Audit Trail vergleichen.
- Batch-Ereignisse sind nicht retained: Ein Batch, dessen Start das Modul verpasst, fehlt (O-31).
- PDF/A-Konformität ist strukturell geprüft (Tests: XMP `pdfaid`, eingebettete Schriften, Farbprofil); eine
  Validierung mit veraPDF steht aus (O-32).
- Sollmenge und Produktname des Mockups liefert die Schnittstelle nicht (O-33); die Seite zeigt Laufzeit statt
  Fortschritt.
