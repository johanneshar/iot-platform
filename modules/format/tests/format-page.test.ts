import { describe, expect, it } from 'vitest';
import { durationMinutes, stepStatus } from '../frontend/pages/FormatPage';
import type { Change } from '../shared/format';

const change = (done: number, performedAt: string | null): Change => ({
  id: 'FW-2026-0001',
  procedure: {
    id: 'p',
    version: 1,
    title: { de: 'P' },
    from: { format: { de: 'A' }, recipe: { id: 'a', version: 1 } },
    to: { format: { de: 'B' }, recipe: { id: 'b', version: 1 } },
    plannedMinutes: 90,
    steps: ['s1', 's2', 's3'].map((id) => ({
      id,
      title: { de: id },
      machine: null,
      text: { de: id },
    })),
  },
  status: 'running',
  startedAt: '2026-10-25T08:00:00.000Z',
  startedBy: { username: 'setup', userName: '[Setup Man]' },
  steps: ['s1', 's2', 's3'].slice(0, done).map((stepId, i) => ({
    stepId,
    scans: null,
    confirmed: {
      seq: i + 1,
      ts: '2026-10-25T08:10:00.000Z',
      username: 'setup',
      userName: '[Setup Man]',
      meaning: null,
    },
  })),
  recordHash: null,
  performed: performedAt
    ? {
        seq: 9,
        ts: performedAt,
        username: 'setup',
        userName: '[Setup Man]',
        meaning: 'Durchgeführt',
      }
    : null,
  released: null,
  cancelled: null,
  recipeCheck: null,
});

describe('Formatwechsel-Seite', () => {
  it('Schrittliste: erledigt, aktuell, offen', () => {
    expect(stepStatus(change(1, null))).toEqual(['done', 'current', 'upcoming']);
    expect(stepStatus(change(3, null))).toEqual(['done', 'done', 'done']);
  });

  it('Dauer bis zur Signatur „Durchgeführt“ in Minuten', () => {
    expect(durationMinutes(change(3, null))).toBeNull();
    expect(durationMinutes(change(3, '2026-10-25T09:21:20.000Z'))).toBe(81);
  });
});
