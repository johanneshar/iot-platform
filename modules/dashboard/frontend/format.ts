/** Zahl in der Sprache der Oberfläche, z. B. 78,4 oder 17.160. */
export function formatNumber(value: number, language: string, fractionDigits = 0): string {
  return new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'de-DE', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Anteil 0–1 als Prozentzahl mit einer Nachkommastelle. */
export function formatPercent(share: number | null, language: string, empty: string): string {
  return share === null ? empty : formatNumber(share * 100, language, 1);
}

/** Uhrzeit in Ortszeit des Standorts, z. B. 13:48. */
export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('de-DE', { timeZone, hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

/** Prozesswert mit so vielen Nachkommastellen, wie die Maschine liefert (höchstens 3), plus Einheit. */
export function formatValue(value: number, unit: string, language: string): string {
  const decimals = Math.min(3, (String(value).split('.')[1] ?? '').length);
  return `${formatNumber(value, language, decimals)}${unit ? ` ${unit}` : ''}`;
}
