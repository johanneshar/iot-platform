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

export interface ShiftDefinition {
  /** Beginn als Ortszeit „HH:MM“ */
  start: string;
  /** Ende als Ortszeit „HH:MM“; vor dem Beginn = über Mitternacht */
  end: string;
}

/**
 * Aktuelle Schicht zum Zeitpunkt `now` aus dem Schichtmodell der Linie (E-29). Liefert `null`, wenn
 * gerade keine Schicht läuft.
 */
export function currentShift(
  shifts: readonly ShiftDefinition[],
  timeZone: string,
  now: Date,
): { start: Date; end: Date } | null {
  const day = 86_400_000;
  // Schichten von gestern, heute und morgen prüfen – deckt Schichten über Mitternacht ab
  for (const offset of [-day, 0, day]) {
    const reference = new Date(now.getTime() + offset);
    for (const shift of shifts) {
      const start = localTimeToUtc(shift.start, timeZone, reference);
      let end = localTimeToUtc(shift.end, timeZone, reference);
      if (end <= start) end = new Date(end.getTime() + day);
      if (start <= now && now < end) return { start, end };
    }
  }
  return null;
}
