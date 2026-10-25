import {
  RETAINED,
  schemaName,
  topicFor,
  type DataByClass,
  type DataClass,
  type Message,
} from '@iot/interface-schema';
import { SITE_TIME_ZONE, type SimAlarm, type SimMachine } from './config';
import { localTimeToUtc } from '@iot/module-sdk/time';

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

export const local = (hhmm: string, now: Date) => localTimeToUtc(hhmm, SITE_TIME_ZONE, now);

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
      source: machine.source,
    },
    now,
  );
}

export function stateMessage(machine: SimMachine, now: Date): Outgoing {
  const since = machine.stateSince ? local(machine.stateSince, now) : now;
  return stateChange(machine, machine.state, machine.reason, since);
}

/** Zustandswechsel zur Laufzeit (Zyklus, O-24). */
export function stateChange(
  machine: SimMachine,
  state: SimMachine['state'],
  reason: string | null,
  at: Date,
): Outgoing {
  return envelope(machine, 'state', { state, mode: 'Production', reason }, at);
}

/** Zählerstand nach `elapsedMs` seit Start; nur im Zustand Execute steigen die Zähler. */
export function countersMessage(machine: SimMachine, elapsedMs: number, now: Date): Outgoing {
  const producing = machine.state === 'Execute' ? (machine.rate * elapsedMs) / 60_000 : 0;
  return countersFor(machine, producing, now);
}

/** Ausgangsstand der Zähler: aus dem Mockup oder nach einem Reset (neuer Batch) bei null. */
export interface CounterBase {
  good: number;
  bad: number;
  resetAt: Date;
}

/** Zählerstand nach `produced` Stück seit `base` (Anteil Schlechtteile wie im Mockup). */
export function countersFor(
  machine: SimMachine,
  produced: number,
  now: Date,
  base: CounterBase = {
    good: machine.counters.good,
    bad: machine.counters.bad,
    resetAt: local(machine.counters.resetAt, now),
  },
): Outgoing {
  const good = base.good + Math.floor(produced * (1 - machine.rejectShare));
  const bad = base.bad + Math.floor(produced * machine.rejectShare);
  const resetAt = base.resetAt.toISOString();
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

/** Einzelnes Alarmereignis zur Laufzeit (Zyklus, O-24). */
export function alarmEvent(
  machine: SimMachine,
  alarm: SimAlarm,
  event: 'raised' | 'cleared',
  at: Date,
): Outgoing {
  return envelope(machine, 'alarms', alarmData(alarm, event), at);
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

/** Batch, zu dem eine Meldung gehört (S-08, S-10). */
export interface BatchRef {
  batchId: string;
  startedAt: Date;
  targetQuantity?: number;
  /** geladenes Rezept, falls abweichend vom Rezept beim Start (Formatwechsel, E-51) */
  recipe?: { id: string; version: number; formatParts: string[] };
}

export function batchEvent(
  machine: SimMachine,
  event: 'started' | 'ended',
  batch: BatchRef,
  at: Date,
): Outgoing | null {
  if (!machine.batch) return null;
  const { productName } = machine.batch;
  const recipe = batch.recipe
    ? { id: batch.recipe.id, version: batch.recipe.version }
    : machine.batch.recipe;
  const formatParts = batch.recipe?.formatParts ?? machine.batch.formatParts;
  return envelope(
    machine,
    'batch',
    {
      event,
      batchId: batch.batchId,
      productName,
      ...(batch.targetQuantity ? { targetQuantity: batch.targetQuantity } : {}),
      startedAt: batch.startedAt.toISOString(),
      recipe,
      formatParts,
    },
    at,
  );
}

/** Batch aus dem Mockup, gestartet zur Uhrzeit des Mockups. */
export function batchMessage(machine: SimMachine, now: Date): Outgoing | null {
  if (!machine.batch) return null;
  const { id, start, targetQuantity } = machine.batch;
  const startedAt = local(start, now);
  return batchEvent(machine, 'started', { batchId: id, startedAt, targetQuantity }, startedAt);
}

/**
 * Stand der anstehenden Alarme (S-09, retained) – bei jeder Änderung vollständig. Stufe basic nur mit
 * Sammelstörung.
 */
export function activeAlarmsMessage(
  machine: SimMachine,
  active: readonly { alarm: SimAlarm; at: Date }[],
  now: Date,
): Outgoing {
  const alarms = active.map(({ alarm, at }) =>
    alarm.alarmId === 'COMMON-FAULT'
      ? {
          alarmId: alarm.alarmId,
          class: 'fault' as const,
          raisedAt: at.toISOString(),
          acknowledged: false,
          user: null,
        }
      : {
          alarmId: alarm.alarmId,
          class: alarm.class,
          textKey: alarm.textKey ?? '',
          text: { de: alarm.text },
          ...(alarm.subsystem ? { subsystem: alarm.subsystem } : {}),
          raisedAt: at.toISOString(),
          acknowledged: false,
          user: null,
        },
  );
  return envelope(machine, 'activeAlarms', { alarms }, now);
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
    activeAlarmsMessage(
      machine,
      machine.alarms
        .filter((a) => a.active)
        .map((alarm) => ({ alarm, at: local(alarm.time, now) })),
      now,
    ),
    valuesMessage(machine, now),
  ].filter((m): m is Outgoing => m !== null);
}
