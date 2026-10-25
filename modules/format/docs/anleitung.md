# Geführter Formatwechsel – Bedienanleitung

Für Einrichter und QA: Mit dem geführten Formatwechsel stellst du die Linie Schritt für Schritt auf ein neues
Format um und schließt den Wechsel mit zwei Signaturen ab.

1. **Zielformat wählen (Einrichter):** „Formatwechsel“ in der Navigation öffnen. Unter „Aktuelles Format“ das
   Zielformat antippen, z. B. „Spritze im Nest“.
   _Ergebnis:_ Links stehen alle Arbeitsschritte, rechts der erste Schritt; oben der Fortschritt.
2. **Linie leerfahren:** Linie leerfahren und alle Maschinen am HMI stoppen.
   _Ergebnis:_ Sobald alle Maschinen „Stopped“ melden, erscheint „Alle Maschinen melden „Stopped““ und
   „Schritt bestätigen“ ist frei.
3. **Schritte abarbeiten:** Text lesen, Arbeit ausführen, „Schritt bestätigen“.
   _Ergebnis:_ Der Schritt ist abgehakt, der nächste erscheint. „Zurück“ nimmt den letzten Schritt zurück.
4. **Formatteile scannen:** Bei Schritten mit Formatteil erst den Code am Teil, dann den Code am Einbauplatz
   scannen (oder eintippen und Enter).
   _Ergebnis:_ „✓ Code geprüft · passt zu …“. Ein falscher Code wird rot angezeigt; bestätigen geht erst mit
   beiden richtigen Codes.
5. **Fremdmaschinen:** Bei Schritten am Isolator die Umstellung nach Herstelleranleitung durchführen und
   bestätigen.
   _Ergebnis:_ Wie jeder andere Schritt im Protokoll und im Audit Trail.
6. **Abschließen (Einrichter):** Nach dem letzten Schritt „Formatwechsel abschließen (e-Signatur)“, Benutzer
   und Passwort eingeben.
   _Ergebnis:_ „Durchgeführt“ mit Name und Zeit; der Wechsel wartet auf die Freigabe.
7. **Freigeben (QA):** „Formatwechsel freigeben (e-Signatur)“, Benutzer und Passwort eingeben. Wer
   abgeschlossen hat, kann nicht freigeben (Vier-Augen-Prinzip).
   _Ergebnis:_ „Formatwechsel abgeschlossen.“ mit Dauer, Vorgabezeit und „Linie bereit für …“.
8. **Rezept prüfen lassen:** Rezept an den Maschinen laden und die Linie starten.
   _Ergebnis:_ Beim ersten Batchstart zeigt die Seite „✓ Batch …: Alle Maschinen melden …“ – oder eine
   Abweichung.

**Hinweise**

- Jeder bestätigte Schritt steht mit Benutzer, Zeit und gescannten Codes im Audit Trail.
- „Abbrechen“ beendet den Wechsel; er bleibt im Audit Trail erhalten.
- Abläufe richtet der Admin unter „Formatwechsel-Abläufe“ ein (Datei im JSON-Format).
