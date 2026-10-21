# @iot/design-tokens

Für alle, die Oberflächen bauen: Hier liegen Farben, Schriften und Maße aus dem Mockup als Tokens
(CLAUDE.md, Abschnitt 7). Kein Modul verwendet Werte außerhalb dieser Tokens.

- Quelle: `src/tokens.ts` – daraus erzeugt `tokens.css` (`pnpm --filter @iot/design-tokens generate`)
- Ein Test prüft, dass `tokens.css` aktuell ist
- CSS: `var(--color-primary)`, `var(--space-16)` …; TypeScript: `cssVar('color', 'primary')`
