import { describe, expect, it } from 'vitest';
import { buildServer } from './server.js';

describe('core backend', () => {
  it('meldet sich unter /api/health', async () => {
    const server = buildServer();
    const response = await server.inject({ method: 'GET', url: '/api/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', service: 'core' });
    await server.close();
  });
});
