# Neue Komponente in @iot/ui

Für Entwicklerinnen und Entwickler: Nach dieser Anleitung hast du eine neue Komponente in `@iot/ui` gebaut –
mit Design Tokens, Übersetzungen, Story, Test und Barrierefreiheitsprüfung.

::: tip Grundregel
Fehlt dir in einem Modul eine Komponente, baust du sie hier – nie im Modul (CLAUDE.md, Abschnitt 7.4).
:::

## Schritte

1. **Ordner anlegen**

   ```text
   packages/ui/src/components/MeineKomponente/
   ├── MeineKomponente.tsx
   ├── MeineKomponente.module.css
   ├── MeineKomponente.stories.tsx
   └── MeineKomponente.test.tsx      # wenn die Komponente Logik hat
   ```

   _Ergebnis:_ Ein Ordner pro Komponente, Dateinamen in `PascalCase`.

2. **Stile nur mit Tokens schreiben**

   ```css
   .box {
     padding: var(--space-16);
     border-radius: var(--radius-xl);
     background: var(--color-surface);
   }
   ```

   Alle Tokens stehen in `packages/design-tokens/src/tokens.ts`. Fehlt ein Wert aus dem Mockup, wird er dort
   ergänzt und `pnpm --filter @iot/design-tokens generate` ausgeführt.

   _Ergebnis:_ `pnpm lint` meldet keine Fehler. Ein Hex-Wert oder `12px` im CSS wird von Stylelint abgelehnt.

3. **Texte nicht fest einbauen**
   - Inhalte (Namen, Meldungen, Beschriftungen) kommen als Props vom Modul.
   - Feste Texte der Komponente selbst (z. B. „Engpass“) stehen in `src/i18n/de.json` und `en.json` und werden
     mit `useUiTranslation()` gelesen.

   _Ergebnis:_ Der Test `translations.test.ts` bestätigt, dass Deutsch und Englisch dieselben Schlüssel haben.

4. **Barrierefrei bauen**
   - echte `<button>`, `<label>`, Überschriften und Listen statt `div`
   - Zustände per `aria-pressed`, `aria-current`; Icons ohne Text bekommen ein `label`
   - Bedeutung nie nur über Farbe (z. B. Alarmpunkt mit verstecktem Text „Störung“)
   - Bedienflächen mindestens `--size-control-height` (44 px) bzw. `-sm` (36 px)

5. **Story schreiben**

   Je Zustand eine Story, Beispieldaten nur aus `@iot/simulator/fixtures/mockup`.

   ```bash
   pnpm storybook
   ```

   _Ergebnis:_ Die Komponente erscheint unter <http://localhost:5182>. Im Tab „Accessibility“ stehen keine
   Verstöße; über die Werkzeugleiste lässt sich die Sprache umschalten.

6. **Exportieren**

   Komponente und Typen in `packages/ui/src/index.ts` eintragen.

7. **Prüfen**

   ```bash
   pnpm lint && pnpm typecheck && pnpm test
   pnpm storybook:build && pnpm exec playwright test --project ui
   ```

   _Ergebnis:_ Alles grün. Der Playwright-Test prüft jede Story in Deutsch und Englisch mit axe.

8. **Doku nachziehen**

   Komponente in die Tabelle unter [Design-System](/architektur/design-system) eintragen, Changelog-Eintrag
   schreiben.
