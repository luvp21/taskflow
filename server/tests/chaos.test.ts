import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { TaskModel } from '../src/models/Task.js';
import { taskBody } from './helpers.js';

const alwaysFail = () => 0; // random() < failRate whenever failRate > 0
const neverFail = () => 0.99;

describe('chaos middleware', () => {
  it('fails a mutating request with 500 before it writes anything', async () => {
    const app = createApp({ chaosEnabled: true, random: alwaysFail });

    const res = await request(app).post('/api/tasks').set('x-chaos-fail-rate', '0.3').send(taskBody());

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/chaos/i);
    expect(await TaskModel.countDocuments()).toBe(0);
  });

  it('lets the request through when the roll succeeds', async () => {
    const app = createApp({ chaosEnabled: true, random: neverFail });

    const res = await request(app).post('/api/tasks').set('x-chaos-fail-rate', '0.3').send(taskBody());

    expect(res.status).toBe(201);
  });

  it('adds the requested latency', async () => {
    const app = createApp({ chaosEnabled: true });
    const started = Date.now();

    await request(app).post('/api/tasks').set('x-chaos-latency', '300').send(taskBody());

    expect(Date.now() - started).toBeGreaterThanOrEqual(290);
  });

  it('never affects reads', async () => {
    const app = createApp({ chaosEnabled: true, random: alwaysFail });

    const res = await request(app).get('/api/tasks').set('x-chaos-fail-rate', '1');

    expect(res.status).toBe(200);
  });

  it('ignores the headers when chaos is disabled', async () => {
    const app = createApp({ chaosEnabled: false, random: alwaysFail });

    const res = await request(app).post('/api/tasks').set('x-chaos-fail-rate', '1').send(taskBody());

    expect(res.status).toBe(201);
  });
});
