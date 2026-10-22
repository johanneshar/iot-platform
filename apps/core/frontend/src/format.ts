/** Zeitstempel (UTC gespeichert) in der Ortszeit des Standorts anzeigen (E-19). */
export function formatTimestamp(iso: string, timeZone: string, language: string): string {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'de-DE', {
    timeZone,
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(iso));
}

/** Initialen aus dem Anzeigenamen, z. B. „[Setup Man]“ → „SM“. */
export function initials(displayName: string): string {
  const words = displayName.replace(/[[\]]/g, '').trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
