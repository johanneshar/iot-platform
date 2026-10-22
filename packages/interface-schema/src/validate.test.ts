import { describe, expect, it } from 'vitest';
import type { DataClass } from './topics';
import { validateData, validateMessage } from './validate';

const envelope = (dataClass: DataClass, data: object) => ({
  schema: `iot.${dataClass}/1.0`,
  machineId: 'l1-fill',
  ts: '2026-10-21T12:14:03.120Z',
  tsEdge: '2026-10-21T12:14:03.188Z',
  quality: 'good',
  data,
});

// Beispiele aus der Schnittstellenspezifikation (Entwurf 0.4): ergänzt um S-03, S-08 bis S-10
const examples: Record<DataClass, object> = {
  identity: {
    type: 'Füll- und Verschließmaschine',
    manufacturer: 'own',
    serial: '[Seriennummer]',
    lineId: 'l1',
    position: 3,
    interfaceVersion: '1.0',
    conformance: 'full',
    nominalRate: 320,
  },
  state: { state: 'Execute', mode: 'Production', reason: null },
  counters: { good: 61880, bad: 2580, total: 64460, resetAt: '2026-10-21T04:14:00Z' },
  alarms: {
    alarmId: 'FILL-WGT-0003',
    event: 'raised',
    class: 'fault',
    textKey: 'alarm.weighcell.tare',
    text: { de: 'Wägezelle 3: Tara-Abweichung', en: 'Weigh cell 3: tare deviation' },
    subsystem: 'Wägung',
    user: null,
  },
  activeAlarms: {
    alarms: [
      {
        alarmId: 'FILL-WGT-0003',
        class: 'fault',
        textKey: 'alarm.weighcell.tare',
        text: { de: 'Wägezelle 3: Tara-Abweichung', en: 'Weigh cell 3: tare deviation' },
        subsystem: 'Wägung',
        raisedAt: '2026-10-21T11:48:00Z',
        acknowledged: false,
        user: null,
      },
    ],
  },
  meta: {
    values: [
      {
        key: 'fillWeightAvg',
        name: { de: 'Füllgewicht Ø', en: 'Fill weight avg' },
        unit: 'g',
        min: 9.9,
        max: 10.1,
        gxp: true,
        sampling: 'onChange',
      },
    ],
  },
  values: { values: [{ key: 'fillWeightAvg', value: 10.02 }] },
  batch: {
    event: 'started',
    batchId: 'B-2026-1042',
    productName: '[Produktname]',
    targetQuantity: 27700,
    startedAt: '2026-10-21T03:58:00Z',
    recipe: { id: 'vial-10ml', version: 3 },
    formatParts: ['FT-2041', 'FT-3110'],
  },
};

describe('Beispiele der Spezifikation', () => {
  for (const [dataClass, data] of Object.entries(examples) as [DataClass, object][]) {
    it(`${dataClass} ist gültig`, () => {
      expect(validateMessage(dataClass, envelope(dataClass, data))).toEqual({
        valid: true,
        errors: [],
      });
    });
  }
});

describe('Umschlag', () => {
  it('lehnt Zeitstempel ohne UTC ab', () => {
    const msg = { ...envelope('state', examples.state), ts: '2026-10-21T14:14:03+02:00' };
    expect(validateMessage('state', msg).valid).toBe(false);
  });

  it('lehnt unbekannte Qualität ab', () => {
    const msg = { ...envelope('state', examples.state), quality: 'ok' };
    expect(validateMessage('state', msg).valid).toBe(false);
  });

  it('lehnt eine machineId mit Großbuchstaben ab', () => {
    const msg = { ...envelope('state', examples.state), machineId: 'L1-Fill' };
    expect(validateMessage('state', msg).valid).toBe(false);
  });

  it('erkennt ein Schema, das nicht zur Datenklasse passt', () => {
    const result = validateMessage('counters', envelope('state', examples.counters));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('passt nicht zur Datenklasse counters');
  });
});

describe('Datenklassen', () => {
  it('state: alle PackML-Zustände sind erlaubt, andere nicht (S-02)', () => {
    expect(
      validateData('state', {
        state: 'Held',
        mode: 'Production',
        reason: 'Stopfensetzer blockiert',
      }).valid,
    ).toBe(true);
    expect(
      validateData('state', { state: 'Running', mode: 'Production', reason: null }).valid,
    ).toBe(false);
  });

  it('identity: Sollleistung ist Pflicht (S-03)', () => {
    const withoutRate: Record<string, unknown> = { ...examples.identity };
    delete withoutRate['nominalRate'];
    expect(validateData('identity', withoutRate).valid).toBe(false);
  });

  it('identity: Datenquelle ist optional (S-07)', () => {
    expect(
      validateData('identity', { ...examples.identity, source: 'OPC UA · PackML-Tags' }).valid,
    ).toBe(true);
    expect(validateData('identity', { ...examples.identity, source: '' }).valid).toBe(false);
  });

  it('counters: basic ohne Schlechtzähler ist gültig', () => {
    expect(
      validateData('counters', { good: 58020, total: 58020, resetAt: '2026-10-21T04:00:00Z' })
        .valid,
    ).toBe(true);
  });

  it('alarms: Sammelstörung ohne Text ist gültig (S-04)', () => {
    expect(
      validateData('alarms', {
        alarmId: 'COMMON-FAULT',
        event: 'raised',
        class: 'fault',
        user: null,
      }).valid,
    ).toBe(true);
  });

  it('alarms: Sammelstörung muss Klasse fault haben', () => {
    expect(
      validateData('alarms', {
        alarmId: 'COMMON-FAULT',
        event: 'raised',
        class: 'warning',
        user: null,
      }).valid,
    ).toBe(false);
  });

  it('alarms: Einzelalarm braucht Textschlüssel und Text', () => {
    expect(
      validateData('alarms', {
        alarmId: 'FILL-WGT-0003',
        event: 'raised',
        class: 'fault',
        user: null,
      }).valid,
    ).toBe(false);
  });

  it('alarms: Quittierung braucht einen Benutzer, sonst ist user null', () => {
    const base = examples.alarms as Record<string, unknown>;
    expect(validateData('alarms', { ...base, event: 'acknowledged', user: null }).valid).toBe(
      false,
    );
    expect(
      validateData('alarms', { ...base, event: 'acknowledged', user: '[Bediener]' }).valid,
    ).toBe(true);
    expect(validateData('alarms', { ...base, event: 'raised', user: '[Bediener]' }).valid).toBe(
      false,
    );
  });

  it('alarms: Text braucht Deutsch', () => {
    const base = examples.alarms as Record<string, unknown>;
    expect(validateData('alarms', { ...base, text: { en: 'only english' } }).valid).toBe(false);
  });

  it('meta: Grenzwerte sind optional (S-06)', () => {
    expect(
      validateData('meta', {
        values: [
          {
            key: 'waterTemperature',
            name: { de: 'Wassertemperatur' },
            unit: '°C',
            gxp: false,
            sampling: 'cyclic',
          },
        ],
      }).valid,
    ).toBe(true);
  });

  it('values: nur Zahlen als Wert', () => {
    expect(
      validateData('values', { values: [{ key: 'reason', value: 'Auslauf gestaut' }] }).valid,
    ).toBe(false);
  });
});

describe('S-08 bis S-10', () => {
  it('batch verlangt Start und Produktname, Sollmenge ist optional', () => {
    const base = {
      event: 'ended',
      batchId: 'B-1',
      recipe: { id: 'r', version: 1 },
      formatParts: [],
    };
    expect(validateData('batch', base).valid).toBe(false);
    expect(
      validateData('batch', { ...base, startedAt: '2026-10-21T03:58:00Z', productName: 'P' }).valid,
    ).toBe(true);
  });

  it('activeAlarms: Einzelalarme mit Text, Sammelstörung ohne', () => {
    expect(
      validateData('activeAlarms', {
        alarms: [
          {
            alarmId: 'COMMON-FAULT',
            class: 'fault',
            raisedAt: '2026-10-21T03:58:00Z',
            acknowledged: false,
            user: null,
          },
        ],
      }).valid,
    ).toBe(true);
    expect(
      validateData('activeAlarms', {
        alarms: [
          {
            alarmId: 'X-1',
            class: 'warning',
            raisedAt: '2026-10-21T03:58:00Z',
            acknowledged: false,
            user: null,
          },
        ],
      }).valid,
    ).toBe(false);
    expect(validateData('activeAlarms', { alarms: [] }).valid).toBe(true);
  });
});
