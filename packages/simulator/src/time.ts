/**
 * Rechnet eine lokale Uhrzeit „HH:MM“ am Kalendertag von `reference` (in `timeZone`) nach UTC um.
 * Die Zeiten im Mockup sind Ortszeiten der Linie.
 */
export function localTimeToUtc(hhmm: string, timeZone: string, reference: Date): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);
  if (
    hours === undefined ||
    minutes === undefined ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    throw new Error(`Ungültige Uhrzeit „${hhmm}“`);
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(reference);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const naiveUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hours, minutes);
  return new Date(naiveUtc - offsetMs(timeZone, new Date(naiveUtc)));
}

/** Abstand der Zeitzone zu UTC in Millisekunden zum gegebenen Zeitpunkt. */
function offsetMs(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asUtc - at.getTime();
}
