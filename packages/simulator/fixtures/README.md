# Fixtures

Beispieldaten für Simulator und Tests. Daten werden ausschließlich aus dem UI-Mockup übernommen (CLAUDE.md, Abschnitt 2, Punkt 7). Seit M1 liegen hier die Daten des UI-Mockups (`mockup.ts`); sie dienen Storybook und Tests. Der Simulator nutzt sie ab M2.

`fault-trees/` enthält die drei Fehlerbäume des Mockups im Format von ADR-007; die `alarmId`s stammen aus dem Simulator.

`flexfill.ts` beschreibt Linie 3 · Flexfill – nicht aus dem Mockup, sondern nach Beschreibung vom 2026-10-22; alle
übrigen Werte sind Annahmen (O-28). `models/` enthält das Flexfill-Blockmodell (`.glb`) und seine Zuordnung
(`flexfill.model.json`, ADR-010).
