import type { LineSnapshot, MachineSnapshot, StatePeriod } from '@iot/module-sdk';
import { describe, expect, it } from 'vitest';
import { executeMs, lineKpis, machineKpis } from '../frontend/kpi/kpi';

const T0 = new Date('2026-10-21T12:00:00Z').getTime();
const at = (minutes: number) => new Date(T0 + minutes * 60_000).toISOString();

function machine(
  id: string,
  position: number,
  states: StatePeriod[],
  counters: { good: number; total: number },
  nominalRate = 320,
): MachineSnapshot {
  return {
    machineId: id,
    identity: {
      type: id,
      manufacturer: 'own',
      serial: '[Seriennummer]',
      lineId: 'l1',
      position,
      interfaceVersion: '1.0',
      conformance: 'full',
      nominalRate,
    },
    meta: null,
    state: {
      state: states.at(-1)?.state ?? 'Idle',
      mode: 'Production',
      reason: null,
      since: states.at(-1)?.since ?? at(0),
    },
    counters: { ...counters, resetAt: at(0), ts: at(60) },
    values: {},
    alarms: [],
    quality: 'good',
    lastMessageAt: at(60),
    invalidMessages: 0,
    history: { states, counterBaseline: { ts: at(0), good: 0, total: 0 }, recentCounters: [] },
  };
}

const NOW = new Date(T0 + 60 * 60_000); // eine Stunde Beobachtung

describe('executeMs', () => {
  it('summiert die Zeit in Execute im Zeitraum', () => {
    const m = machine(
      'a',
      1,
      [
        { state: 'Execute', since: at(0) },
        { state: 'Held', since: at(45) },
        { state: 'Execute', since: at(51) },
      ],
      { good: 0, total: 0 },
    );
    expect(executeMs(m, T0, NOW.getTime()) / 60_000).toBe(54);
  });
});

describe('machineKpis (E-27)', () => {
  // 54 min von 60 min in Execute, 16.000 Stück bei Soll 320/min, davon 15.360 gut
  const m = machine(
    'fill',
    1,
    [
      { state: 'Execute', since: at(0) },
      { state: 'Held', since: at(45) },
      { state: 'Execute', since: at(51) },
    ],
    { good: 15_360, total: 16_000 },
  );
  const kpi = machineKpis(m, NOW);

  it('Verfügbarkeit = Zeit in Execute ÷ geplante Zeit', () => {
    expect(kpi.availability).toBeCloseTo(0.9, 6);
  });

  it('Leistung = Menge ÷ (Sollleistung × Zeit in Execute)', () => {
    expect(kpi.performance).toBeCloseTo(16_000 / (320 * 54), 6);
  });

  it('Qualität = Gutteile ÷ Menge', () => {
    expect(kpi.quality).toBeCloseTo(0.96, 6);
    expect(kpi.rejectShare).toBeCloseTo(0.04, 6);
  });

  it('OEE = Verfügbarkeit × Leistung × Qualität = Gutteile ÷ (Soll × geplante Zeit)', () => {
    expect(kpi.oee).toBeCloseTo(15_360 / (320 * 60), 6);
  });

  it('Ausbringung in Gutteilen pro Stunde', () => {
    expect(kpi.goodPerHour).toBeCloseTo(15_360, 6);
  });

  it('eine Maschine, die nur stand, hat OEE 0', () => {
    const stopped = machine('x', 1, [{ state: 'Held', since: at(0) }], { good: 0, total: 0 });
    expect(machineKpis(stopped, NOW)).toMatchObject({ availability: 0, oee: 0, quality: null });
  });

  it('zu kurze Beobachtung liefert noch keine Kennzahlen', () => {
    expect(machineKpis(m, new Date(T0 + 5_000)).oee).toBeNull();
  });
});

describe('lineKpis', () => {
  it('nimmt die Gutteile am Ende der Linie', () => {
    const line: LineSnapshot = {
      lineId: 'l1',
      shift: null,
      oeeTarget: 82,
      machines: [
        machine('insp', 3, [{ state: 'Execute', since: at(0) }], { good: 9_600, total: 10_000 }),
        machine('wash', 1, [{ state: 'Execute', since: at(0) }], { good: 19_200, total: 19_200 }),
      ],
    };
    expect(lineKpis(line, NOW).oee).toBeCloseTo(9_600 / (320 * 60), 6);
  });
});
