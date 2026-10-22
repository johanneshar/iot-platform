import { describe, expect, it } from 'vitest';
import { currentRate, findBottleneck, lineState } from './analysis';
import type { LineSnapshot, MachineSnapshot, PackMLState } from './types';

const NOW = new Date('2026-10-21T12:00:00Z');

function machine(
  id: string,
  position: number,
  state: PackMLState,
  perMinute: number,
  nominal = 320,
): MachineSnapshot {
  const t0 = NOW.getTime() - 60_000;
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
      nominalRate: nominal,
    },
    meta: null,
    state: { state, mode: 'Production', reason: null, since: new Date(t0).toISOString() },
    counters: null,
    values: {},
    alarms: [],
    quality: 'good',
    lastMessageAt: NOW.toISOString(),
    invalidMessages: 0,
    history: {
      states: [],
      counterBaseline: null,
      recentCounters: [
        { ts: new Date(t0).toISOString(), good: 0, total: 0 },
        { ts: NOW.toISOString(), good: perMinute, total: perMinute },
      ],
    },
  };
}

const line = (...machines: MachineSnapshot[]): LineSnapshot => ({
  lineId: 'l1',
  shift: null,
  oeeTarget: 82,
  machines,
});

describe('currentRate', () => {
  it('rechnet Stück pro Minute aus den Zählerständen', () => {
    expect(currentRate(machine('a', 1, 'Execute', 286), NOW)).toBe(286);
  });

  it('ohne zwei Zählerstände keine Leistung', () => {
    const m = machine('a', 1, 'Execute', 286);
    m.history.recentCounters = m.history.recentCounters.slice(1);
    expect(currentRate(m, NOW)).toBeNull();
  });
});

describe('findBottleneck (E-28)', () => {
  it('nimmt die langsamste produzierende Maschine im Verhältnis zur Sollleistung', () => {
    const l = line(
      machine('wash', 1, 'Execute', 312),
      machine('fill', 2, 'Execute', 286),
      machine('insp', 3, 'Suspended', 0),
    );
    expect(findBottleneck(l, NOW)).toBe('fill');
  });

  it('eine Maschine in Held geht vor', () => {
    const l = line(
      machine('detub', 1, 'Idle', 0),
      machine('fill', 2, 'Held', 0),
      machine('label', 3, 'Execute', 100),
    );
    expect(findBottleneck(l, NOW)).toBe('fill');
  });

  it('berücksichtigt unterschiedliche Sollleistungen', () => {
    const l = line(machine('a', 1, 'Execute', 300, 400), machine('b', 2, 'Execute', 250, 300));
    expect(findBottleneck(l, NOW)).toBe('a'); // 75 % gegen 83 %
  });

  it('ohne produzierende Maschine kein Engpass', () => {
    expect(findBottleneck(line(machine('a', 1, 'Idle', 0)), NOW)).toBeNull();
  });
});

describe('lineState', () => {
  it('Execute, solange produziert wird und nichts steht', () => {
    expect(lineState(line(machine('a', 1, 'Execute', 1), machine('b', 2, 'Suspended', 0)))).toBe(
      'Execute',
    );
  });

  it('Held, wenn eine Maschine steht', () => {
    expect(lineState(line(machine('a', 1, 'Idle', 0), machine('b', 2, 'Held', 0)))).toBe('Held');
  });
});
