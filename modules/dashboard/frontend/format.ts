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

/** Dauer als „7 h 19 min“ bzw. „18 min“. */
export function durationParts(ms: number): { key: 'hm' | 'm' | 'lt1'; h: number; m: number } {
  const minutes = Math.round(ms / 60_000);
  if (ms <= 0) return { key: 'm', h: 0, m: 0 };
  if (minutes < 1) return { key: 'lt1', h: 0, m: 0 };
  const h = Math.floor(minutes / 60);
  return h > 0 ? { key: 'hm', h, m: minutes % 60 } : { key: 'm', h: 0, m: minutes };
}

/** Datum und Uhrzeit in Ortszeit des Standorts, z. B. 21.10. 13:48. */
export function formatDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
