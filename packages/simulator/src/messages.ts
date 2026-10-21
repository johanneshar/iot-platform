import {
  RETAINED,
  schemaName,
  topicFor,
  type DataByClass,
  type DataClass,
  type Message,
} from '@iot/interface-schema';
import { SITE_TIME_ZONE, type SimAlarm, type SimMachine } from './config';
import { localTimeToUtc } from './time';

export interface Outgoing {
  topic: string;
  retain: boolean;
  message: Message<DataClass>;
}

/** Bediener für Quittierungen im Simulator (Platzhalter wie im Mockup). */
const ACK_USER = '[Bediener]';

function envelope<C extends DataClass>(
  machine: SimMachine,
  dataClass: C,
  data: DataByClass[C],
  at: Date,
): Outgoing {
  const ts = at.toISOString();
  return {
    topic: topicFor(machine.lineId, machine.id, dataClass),
    retain: RETAINED[dataClass],
    // Der Simulator ersetzt Steuerung und Normalizer: Quell- und Edge-Zeit sind gleich
    message: {
      schema: schemaName(dataClass),
      machineId: machine.id,
      ts,
      tsEdge: ts,
      quality: 'good',
      data,
    },
  };
}

const local = (hhmm: string, now: Date) => localTimeToUtc(hhmm, SITE_TIME_ZONE, now);

export function identityMessage(machine: SimMachine, now: Date): Outgoing {
  return envelope(
    machine,
    'identity',
    {
      type: machine.name,
      manufacturer: machine.own ? 'own' : '[Hersteller]',
      serial: '[Seriennummer]',
      lineId: machine.lineId,
      position: machine.position,
      interfaceVersion: '1.0',
      conformance: machine.conformance,
      nominalRate: machine.nominalRate,
    },
    now,
  );
}

export function stateMessage(machine: SimMachine, now: Date): Outgoing {
  const since = machine.stateSince ? local(machine.stateSince, now) : now;
  return envelope(
    machine,
    'state',
    { state: machine.state, mode: 'Production', reason: machine.reason },
    since,
  );
}

/** Zählerstand nach `elapsedMs` seit Start; nur im Zustand Execute steigen die Zähler. */
export function countersMessage(machine: SimMachine, elapsedMs: number, now: Date): Outgoing {
  const producing = machine.state === 'Execute' ? (machine.rate * elapsedMs) / 60_000 : 0;
  const good = machine.counters.good + Math.floor(producing * (1 - machine.rejectShare));
  const bad = machine.counters.bad + Math.floor(producing * machine.rejectShare);
  const resetAt = local(machine.counters.resetAt, now).toISOString();
  // Stufe basic liefert nur gut und gesamt (Spezifikation, Konformitätsstufen)
  const data =
    machine.conformance === 'basic'
      ? { good, total: good + bad, resetAt }
      : { good, bad, total: good + bad, resetAt };
  return envelope(machine, 'counters', data, now);
}

export function metaMessage(machine: SimMachine, now: Date): Outgoing | null {
  if (machine.values.length === 0) return null;
  return envelope(
    machine,
    'meta',
    {
      values: machine.values.map((v) => ({
        key: v.key,
        name: { de: v.label },
        unit: v.unit,
        ...(v.min !== undefined ? { min: v.min } : {}),
        ...(v.max !== undefined ? { max: v.max } : {}),
        gxp: v.gxp,
        sampling: 'cyclic' as const,
      })),
    },
    now,
  );
}

export function valuesMessage(machine: SimMachine, now: Date): Outgoing | null {
  const [first, ...rest] = machine.values.map((v) => ({ key: v.key, value: v.value }));
  if (!first) return null;
  return envelope(machine, 'values', { values: [first, ...rest] }, now);
}

function alarmData(
  alarm: SimAlarm,
  event: 'raised' | 'cleared' | 'acknowledged',
): DataByClass['alarms'] {
  if (alarm.alarmId === 'COMMON-FAULT') {
    return {
      alarmId: alarm.alarmId,
      event,
      class: 'fault',
      user: event === 'acknowledged' ? ACK_USER : null,
    };
  }
  return {
    alarmId: alarm.alarmId,
    event,
    class: alarm.class,
    textKey: alarm.textKey ?? '',
    text: { de: alarm.text },
    ...(alarm.subsystem ? { subsystem: alarm.subsystem } : {}),
    user: event === 'acknowledged' ? ACK_USER : null,
  };
}

/**
 * Alarmereignisse wie im Mockup: aktive Alarme kommen, vergangene kommen und gehen zur selben Zeit
 * (Dauer im Mockup nicht angegeben). Quittiert wird nur ab Stufe full (Spezifikation).
 */
export function alarmMessages(machine: SimMachine, now: Date): Outgoing[] {
  return machine.alarms.flatMap((alarm) => {
    const at = local(alarm.time, now);
    const events: ('raised' | 'cleared' | 'acknowledged')[] = alarm.active
      ? ['raised']
      : machine.conformance === 'full'
        ? ['raised', 'cleared', 'acknowledged']
        : ['raised', 'cleared'];
    return events.map((event) => envelope(machine, 'alarms', alarmData(alarm, event), at));
  });
}

export function batchMessage(machine: SimMachine, now: Date): Outgoing | null {
  if (!machine.batch) return null;
  const { id, start, recipe, formatParts } = machine.batch;
  return envelope(
    machine,
    'batch',
    { event: 'started', batchId: id, recipe, formatParts },
    local(start, now),
  );
}

/** Alle Nachrichten beim Start einer Maschine, in sinnvoller Reihenfolge. */
export function startupMessages(machine: SimMachine, now: Date): Outgoing[] {
  return [
    identityMessage(machine, now),
    metaMessage(machine, now),
    stateMessage(machine, now),
    countersMessage(machine, 0, now),
    batchMessage(machine, now),
    ...alarmMessages(machine, now),
    valuesMessage(machine, now),
  ].filter((m): m is Outgoing => m !== null);
}
