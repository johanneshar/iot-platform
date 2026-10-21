import { describe, expect, it } from 'vitest';
import { RETAINED, parseTopic, schemaName, topicFor } from './topics';

describe('Topics', () => {
  it('baut und zerlegt Topics', () => {
    const topic = topicFor('l1', 'l1-fill', 'state');
    expect(topic).toBe('iot/v1/l1/l1-fill/state');
    expect(parseTopic(topic)).toEqual({ lineId: 'l1', machineId: 'l1-fill', dataClass: 'state' });
  });

  it('ignoriert fremde Topics', () => {
    expect(parseTopic('ie/d/j/simatic/v1/s7c1/dp/r/plc1')).toBeNull();
    expect(parseTopic('iot/v1/l1/l1-fill/unknown')).toBeNull();
  });

  it('kennt die retained-Topics der Spezifikation', () => {
    expect(RETAINED.state).toBe(true);
    expect(RETAINED.alarms).toBe(false);
  });

  it('benennt das Schema im Umschlag', () => {
    expect(schemaName('counters')).toBe('iot.counters/1.0');
  });
});
