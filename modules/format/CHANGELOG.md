# Changelog

## 0.1.0 (2026-10-25)

- Geführter Formatwechsel nach Mockup: Zielformat, Schrittliste, Schritt mit Formatteil-Scan (Teil und
  Einbauplatz, E-17), Fortschritt, Zurück und Abbrechen
- „Linie leerfahren“ erst, wenn alle Maschinen „Stopped“ melden; jeder Schritt im Audit Trail
- Abschluss mit zwei Signaturen im Vier-Augen-Prinzip („Durchgeführt“, „Freigabe“), gebunden an den
  Protokoll-Hash (E-50, ADR-013)
- Rezeptprüfung beim ersten Batchstart nach der Freigabe; Abläufe versioniert, Einrichten als JSON-Datei
