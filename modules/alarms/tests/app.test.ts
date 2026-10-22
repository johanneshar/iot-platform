import { proxyHeaders } from '@iot/module-sdk/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../backend/app';
import { AlarmHistory } from '../backend/history';

const TOKEN = 'test-token';
const headers = proxyHeaders(
  { username: 'bediener', displayName: 'Bediener', permissions: [] },
  TOKEN,
);

describe('API von Alarm-Analytics', () => {
  let history: AlarmHistory;
  let app: ReturnType<typeof buildApp>;
  beforeEach(() => {
    history = new AlarmHistory(':memory:');
    history.record(
      'filler',
      {
        alarmId: 'A-1',
        event: 'raised',
        class: 'fault',
        textKey: 'a.b',
        text: { de: 'A' },
        user: null,
      },
      new Date().toISOString(),
    );
    app = buildApp({ history, token: TOKEN, retentionDays: 90, logger: false });
  });
  afterEach(async () => {
    await app.close();
    history.close();
  });

  it('nur über den Proxy des Core', async () => {
    expect((await app.inject({ url: '/history' })).statusCode).toBe(401);
    expect(
      (await app.inject({ url: '/top-faults', headers: { 'x-iot-token': 'falsch' } })).statusCode,
    ).toBe(401);
  });

  it('liefert Verlauf und Top-Störungen', async () => {
    const list = await app.inject({ url: '/history?days=1', headers });
    expect(list.json<{ alarmId: string }[]>().map((a) => a.alarmId)).toEqual(['A-1']);
    const top = await app.inject({ url: '/top-faults', headers });
    expect(top.json<{ alarmId: string }[]>()[0]?.alarmId).toBe('A-1');
  });

  it('begrenzt den Zeitraum auf die Aufbewahrung', async () => {
    expect((await app.inject({ url: '/history?days=91', headers })).statusCode).toBe(400);
    expect((await app.inject({ url: '/history?days=abc', headers })).statusCode).toBe(400);
  });

  it('bietet kein Quittieren an (E-32)', async () => {
    const response = await app.inject({ method: 'POST', url: '/acknowledge', headers });
    expect(response.statusCode).toBe(404);
  });
});
