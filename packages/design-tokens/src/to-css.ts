import { tokens } from './tokens';

const HEADER = `/* Automatisch erzeugt aus src/tokens.ts – nicht von Hand bearbeiten.
   Neu erzeugen: pnpm --filter @iot/design-tokens generate */`;

/** Erzeugt den Inhalt von tokens.css aus den Tokens. */
export function toCss(): string {
  const lines: string[] = [];
  for (const [group, values] of Object.entries(tokens)) {
    for (const [name, value] of Object.entries(values as Record<string, string>)) {
      lines.push(`  --${group}-${name}: ${value};`);
    }
  }
  return `${HEADER}\n:root {\n${lines.join('\n')}\n}\n`;
}
