import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('error handling', () => {
  it('returns 404 JSON for an unknown route', async () => {
    const res = await request(createApp()).get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Route GET /api/nope not found' });
  });

  it('returns 400 for a malformed JSON body', async () => {
    const res = await request(createApp())
      .post('/api/nope')
      .set('Content-Type', 'application/json')
      .send('{"title": ');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Malformed JSON body' });
  });
});
