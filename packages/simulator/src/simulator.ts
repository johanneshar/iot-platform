import { buildLines, type SimLine } from './config';
import { countersMessage, startupMessages, valuesMessage, type Outgoing } from './messages';

export type Publish = (outgoing: Outgoing) => void;

export interface SimulatorOptions {
  /** Takt der Zähler (Spezifikation: Vorschlag 5 s) */
  countersIntervalMs?: number;
  /** Takt der Prozesswerte */
  valuesIntervalMs?: number;
  /** Uhr – in Tests ersetzbar */
  now?: () => Date;
}

/** Erzeugt die Daten beider Linien aus dem Mockup und gibt sie über `publish` aus. */
export class Simulator {
  readonly lines: SimLine[] = buildLines();
  private timers: ReturnType<typeof setInterval>[] = [];
  private startedAt = 0;

  constructor(
    private readonly publish: Publish,
    private readonly options: SimulatorOptions = {},
  ) {}

  private now(): Date {
    return this.options.now?.() ?? new Date();
  }

  private get machines() {
    return this.lines.flatMap((line) => line.machines);
  }

  start(): void {
    const now = this.now();
    this.startedAt = now.getTime();
    for (const machine of this.machines) startupMessages(machine, now).forEach(this.publish);

    this.timers.push(
      setInterval(() => {
        this.tickCounters();
      }, this.options.countersIntervalMs ?? 5_000),
      setInterval(() => {
        this.tickValues();
      }, this.options.valuesIntervalMs ?? 10_000),
    );
  }

  tickCounters(): void {
    const now = this.now();
    const elapsed = now.getTime() - this.startedAt;
    for (const machine of this.machines) this.publish(countersMessage(machine, elapsed, now));
  }

  tickValues(): void {
    const now = this.now();
    for (const machine of this.machines) {
      const message = valuesMessage(machine, now);
      if (message) this.publish(message);
    }
  }

  stop(): void {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }
}
