# Fixtures

Beispieldaten für Simulator und Tests. Daten werden ausschließlich aus dem UI-Mockup übernommen (CLAUDE.md, Abschnitt 2, Punkt 7). Seit M1 liegen hier die Daten des UI-Mockups (`mockup.ts`); sie dienen Storybook und den Komponententests. Der Simulator nutzt seit 2026-10-22 nur noch `flexfill.ts` (E-47).

`fault-trees/` enthält die drei Fehlerbäume des Mockups im Format von ADR-007; die `alarmId`s stammen aus dem Simulator.

`flexfill.ts` beschreibt Linie 3 · Flexfill – nicht aus dem Mockup, sondern nach Beschreibung vom 2026-10-22; inklusive Isolator als Fremdmaschine der Stufe Basis; alle
übrigen Werte sind Annahmen (bestätigt, E-48). `models/` enthält das Flexfill-Blockmodell (`.glb`) und seine Zuordnung
(`flexfill.model.json`, ADR-010).

`format-procedures/` enthält den Formatwechsel-Ablauf „Flexfill: Vial im Nest → Spritze im Nest“ (ADR-013),
`spares/` den Ersatzteilkatalog der Flexfill. Der Ablauf und die Formatteile `FT-33…` sind auf Wunsch des
Projektverantwortlichen erfunden (2026-10-25, E-51); die übrigen Teile stammen aus dem Mockup.
