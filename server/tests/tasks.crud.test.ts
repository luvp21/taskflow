import { describe, expect, it } from 'vitest';
import { TaskModel } from '../src/models/Task.js';
import { api, createTask, taskBody } from './helpers.js';

describe('GET /api/tasks', () => {
  it('returns tasks sorted by column, then orderIndex', async () => {
    const second = await createTask({ title: 'second', orderIndex: 2000 });
    const first = await createTask({ title: 'first', orderIndex: 1000 });
    const done = await createTask({ title: 'done', columnId: 'done' });

    const res = await api().get('/api/tasks');

    expect(res.status).toBe(200);
    const ids = res.body.map((task: { _id: string }) => task._id);
    expect(ids).toEqual([done._id, first._id, second._id]);
  });
});

describe('POST /api/tasks', () => {
  it('creates a task with defaults and version 0', async () => {
    const body = taskBody({ title: '  Set up auth  ' });

    const res = await api().post('/api/tasks').send(body);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      _id: body._id,
      title: 'Set up auth',
      description: '',
      priority: 'medium',
      columnId: 'todo',
      orderIndex: 1000,
      tags: [],
      version: 0,
    });
  });

  it('appends to the end of the column when no orderIndex is given', async () => {
    await createTask({ orderIndex: 5000 });

    const res = await api().post('/api/tasks').send(taskBody());

    expect(res.body.orderIndex).toBe(6000);
  });

  it('is idempotent: the same _id twice creates one task (201 then 200)', async () => {
    const body = taskBody();

    const first = await api().post('/api/tasks').send(body);
    const second = await api().post('/api/tasks').send(body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(await TaskModel.countDocuments()).toBe(1);
  });

  it('creates one task when the same create is sent twice at the same time', async () => {
    const body = taskBody();

    const results = await Promise.all([
      api().post('/api/tasks').send(body),
      api().post('/api/tasks').send(body),
    ]);

    expect(results.map((res) => res.status).sort()).toEqual([200, 201]);
    expect(await TaskModel.countDocuments()).toBe(1);
  });

  it('returns 400 with field errors for an invalid body', async () => {
    const res = await api()
      .post('/api/tasks')
      .send({ _id: 'not-a-uuid', title: '', columnId: 'archive' });

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields.fieldErrors)).toEqual(
      expect.arrayContaining(['_id', 'title', 'columnId']),
    );
  });
});

describe('PATCH /api/tasks/:id', () => {
  it('updates fields and increments the version', async () => {
    const task = await createTask();

    const res = await api()
      .patch(`/api/tasks/${task._id}`)
      .send({ title: 'Renamed', priority: 'high', version: 0 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'Renamed', priority: 'high', version: 1 });
  });

  it('returns 409 with the current task when the version is stale', async () => {
    const task = await createTask();
    await api().patch(`/api/tasks/${task._id}`).send({ title: 'First write', version: 0 });

    const res = await api()
      .patch(`/api/tasks/${task._id}`)
      .send({ title: 'Stale write', version: 0 });

    expect(res.status).toBe(409);
    expect(res.body.task).toMatchObject({ title: 'First write', version: 1 });
  });

  it('returns 404 for an unknown id', async () => {
    const res = await api().patch('/api/tasks/missing').send({ title: 'x', version: 0 });

    expect(res.status).toBe(404);
  });

  it('returns 400 when only the version is sent', async () => {
    const task = await createTask();

    const res = await api().patch(`/api/tasks/${task._id}`).send({ version: 0 });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('returns 204, then 404 once the task is gone', async () => {
    const task = await createTask();

    const first = await api().delete(`/api/tasks/${task._id}`);
    const second = await api().delete(`/api/tasks/${task._id}`);

    expect(first.status).toBe(204);
    expect(second.status).toBe(404);
  });
});
