# Batch-Reporting – Bedienanleitung

Für Bedienpersonal, Einrichter und QA: Mit dem Batch-Reporting begleitest du einen Batch von der
Linienfreigabe bis zum signierten Batchbericht.

1. **Linie freigeben (QA):** Läuft kein Batch, erscheint „Linienfreigabe für den nächsten Batch“. „Linie
   freigeben (e-Signatur)“ antippen, Benutzer und Passwort eingeben.
   _Ergebnis:_ „Linie freigegeben“ – die Freigabe gilt für den nächsten Batch, den die Maschinen starten.
2. **Batch verfolgen:** Die Karte zeigt Batchnummer, Rezept, Gutteile, Ausschuss, Start und Laufzeit sowie den
   Verlauf Rüsten → Linienfreigabe → Produktion → Linienräumung → Bericht & Freigabe.
   _Ergebnis:_ Fehlt die Linienfreigabe, steht ein Hinweis darunter; die QA kann sie nachholen.
3. **Linienräumung bestätigen (Bedienpersonal, Einrichter):** Nach Batchende „Linienräumung bestätigen“.
   _Ergebnis:_ Der Batchbericht wird eingefroren; sein Bericht-Hash erscheint in der Karte „Batchbericht“.
4. **Bericht prüfen (Einrichter):** „Bericht prüfen (e-Signatur „Geprüft“)“, Benutzer und Passwort eingeben.
   _Ergebnis:_ „Geprüft von …“ – die Freigabe steht jetzt der QA offen.
5. **Bericht freigeben (QA):** „Elektronisch signieren (Freigabe)“, Benutzer und Passwort eingeben. Wer geprüft
   hat, kann nicht freigeben (Vier-Augen-Prinzip).
   _Ergebnis:_ „Signiert von …“, Status „Freigegeben“.
6. **PDF exportieren (QA, Admin):** „Bericht als PDF exportieren“.
   _Ergebnis:_ Datei `Batchbericht-<Batch>.pdf` im Format PDF/A; der Export steht im Audit Trail.
7. **Frühere Batches:** In der Liste „Batches“ „Öffnen“ antippen.
   _Ergebnis:_ Batch, Audit Trail und Bericht dieses Batches werden angezeigt.

**Hinweise**

- Ein freigegebener Bericht ist unveränderbar. Jede Signatur bezieht sich auf den Bericht-Hash.
- „Daten unsicher“: Zählersprünge waren nicht plausibel; Datenquelle prüfen, bevor freigegeben wird.
