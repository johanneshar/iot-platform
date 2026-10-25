# Geführter Formatwechsel – Schulung

Für Einrichter und QA: Nach dieser Schulung führst du einen Formatwechsel vollständig und GMP-konform durch und
erklärst, was die Plattform dabei prüft.

## Lernziele

- Du führst einen Formatwechsel vom Leerfahren bis zur Freigabe durch.
- Du erklärst, warum jedes Formatteil zweimal gescannt wird (Teil und Einbauplatz).
- Du erklärst das Vier-Augen-Prinzip und die Rezeptprüfung beim nächsten Batchstart.

## Übungen

Vorbereitung in der Entwicklung: `pnpm dev` läuft, Linie 3 · Flexfill.

1. Melde dich als Einrichter (`setup`) an und starte den Wechsel „Vial im Nest → Spritze im Nest“. Versuche,
   Schritt 1 zu bestätigen. Stoppe dann die Linie mit `pnpm sim stop` und bestätige erneut.
2. Scanne beim Schritt „Tubführung wechseln“ zuerst einen falschen Code (`FT-2041`), dann die richtigen Codes.
3. Nimm einen Schritt mit „Zurück“ zurück und sieh dir im Audit Trail an, was erfasst wurde.
4. Schließe den Wechsel als Einrichter ab. Versuche anschließend als Einrichter freizugeben.
5. Gib als QA (`qa`) frei. Lade dann das Rezept (`pnpm sim recipe syringe-nest`), starte die Linie
   (`pnpm sim start`) und beobachte die Rezeptprüfung.

## Prüffragen

1. Warum lässt sich „Linie leerfahren“ erst bestätigen, wenn alle Maschinen „Stopped“ melden?
2. Was steht im Audit Trail, wenn du ein Formatteil von Hand eintippst statt zu scannen?
3. Warum dürfen Durchführung und Freigabe nicht von derselben Person kommen?
4. Warum lädt die Plattform das Rezept nicht selbst in die Maschine?
5. Was zeigt die Seite, wenn eine Maschine nach der Freigabe noch das alte Rezept meldet?
