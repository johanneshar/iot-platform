/** Liest eine deutsch formatierte Zahl aus einem Anzeigetext, z. B. „82,1 °C“ → 82.1, „58.410“ → 58410. */
export function parseGermanNumber(text: string): number {
  const match = /-?[\d.]+(,\d+)?/.exec(text);
  if (!match) throw new Error(`Keine Zahl in „${text}“`);
  return Number(match[0].replace(/\./g, '').replace(',', '.'));
}
