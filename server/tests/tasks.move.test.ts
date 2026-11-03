import { describe, expect, it } from 'vitest';
import { TaskModel, type ColumnId, type Task } from '../src/models/Task.js';
import { api, createTask } from './helpers.js';

interface MoveBody {
  columnId: ColumnId;
  beforeId: string | null;
  afterId: string | null;
  version: number;
}

const move = (id: string, body: MoveBody) => api().patch(`/api/tasks/${id}/move`).send(body);

async function orderOf(columnId: ColumnId): Promise<string[]> {
  const tasks = await TaskModel.find({ columnId }).sort({ orderIndex: 1, _id: 1 }).lean<Task[]>();
  return tasks.map((task) => task.title);
}

describe('PATCH /api/tasks/:id/move', () => {
  it('lands strictly between two neighbors in another column', async () => {
    const a = await createTask({ title: 'a', columnId: 'done', orderIndex: 1000 });
    const b = await createTask({ title: 'b', columnId: 'done', orderIndex: 2000 });
    const card = await createTask({ title: 'card' });

    const res = await move(card._id, { columnId: 'done', beforeId: a._id, afterId: b._id, version: 0 });

    expect(res.status).toBe(200);
    expect(res.body.rebalanced).toBe(false);
    expect(res.body.task).toMatchObject({ columnId: 'done', version: 1 });
    expect(res.body.task.orderIndex).toBeGreaterThan(1000);
    expect(res.body.task.orderIndex).toBeLessThan(2000);
    expect(await orderOf('done')).toEqual(['a', 'card', 'b']);
  });

  it('moves to the top and to the bottom of a column', async () => {
    const first = await createTask({ title: 'first', orderIndex: 1000 });
    const last = await createTask({ title: 'last', orderIndex: 2000 });
    const top = await createTask({ title: 'top', columnId: 'done' });
    const bottom = await createTask({ title: 'bottom', columnId: 'done' });

    await move(top._id, { columnId: 'todo', beforeId: null, afterId: first._id, version: 0 });
    await move(bottom._id, { columnId: 'todo', beforeId: last._id, afterId: null, version: 0 });

    expect(await orderOf('todo')).toEqual(['top', 'first', 'last', 'bottom']);
  });

  it('starts an empty column at 1000', async () => {
    const card = await createTask({ orderIndex: 5000 });

    const res = await move(card._id, { columnId: 'in_progress', beforeId: null, afterId: null, version: 0 });

    expect(res.body.task.orderIndex).toBe(1000);
  });

  it('uses the current neighbors when the client view is stale', async () => {
    const a = await createTask({ title: 'a', orderIndex: 1000 });
    await createTask({ title: 'new', orderIndex: 1500 });
    const b = await createTask({ title: 'b', orderIndex: 2000 });
    const card = await createTask({ title: 'card', columnId: 'done' });

    // The client never saw "new", so it asks for a slot between a and b.
    await move(card._id, { columnId: 'todo', beforeId: a._id, afterId: b._id, version: 0 });

    expect(await orderOf('todo')).toEqual(['a', 'card', 'new', 'b']);
  });

  it('ignores a neighbor that is not in the target column', async () => {
    const elsewhere = await createTask({ title: 'elsewhere', columnId: 'done' });
    await createTask({ title: 'only', columnId: 'in_progress', orderIndex: 1000 });
    const card = await createTask({ title: 'card' });

    await move(card._id, { columnId: 'in_progress', beforeId: elsewhere._id, afterId: null, version: 0 });

    expect(await orderOf('in_progress')).toEqual(['only', 'card']);
  });

  it('returns 409 with the current task for a stale version', async () => {
    const card = await createTask();
    await move(card._id, { columnId: 'done', beforeId: null, afterId: null, version: 0 });

    const res = await move(card._id, { columnId: 'in_progress', beforeId: null, afterId: null, version: 0 });

    expect(res.status).toBe(409);
    expect(res.body.task).toMatchObject({ columnId: 'done', version: 1 });
  });

  it('returns 404 for an unknown id and 400 for an invalid body', async () => {
    const missing = await move('missing', { columnId: 'done', beforeId: null, afterId: null, version: 0 });
    const invalid = await api().patch('/api/tasks/any/move').send({ columnId: 'archive' });

    expect(missing.status).toBe(404);
    expect(invalid.status).toBe(400);
  });

  it('rebalances the column when the gap is below 1e-6, without bumping other versions', async () => {
    const a = await createTask({ title: 'a', orderIndex: 1000 });
    const b = await createTask({ title: 'b', orderIndex: 1000 + 1e-7 });
    await createTask({ title: 'c', orderIndex: 3000 });
    const card = await createTask({ title: 'card', columnId: 'done' });

    const res = await move(card._id, { columnId: 'todo', beforeId: a._id, afterId: b._id, version: 0 });

    expect(res.status).toBe(200);
    expect(res.body.rebalanced).toBe(true);
    expect(res.body.task).toMatchObject({ orderIndex: 1500, version: 1 });
    expect(await orderOf('todo')).toEqual(['a', 'card', 'b', 'c']);

    const others = await TaskModel.find({ title: { $in: ['a', 'b', 'c'] } })
      .sort({ orderIndex: 1 })
      .lean<Task[]>();
    expect(others.map((task) => task.orderIndex)).toEqual([1000, 2000, 3000]);
    expect(others.every((task) => task.version === 0)).toBe(true);
  });

  it('rolls back the rebalance when the moved card has a stale version', async () => {
    const a = await createTask({ title: 'a', orderIndex: 1000 });
    const b = await createTask({ title: 'b', orderIndex: 1000 + 1e-7 });
    const card = await createTask({ title: 'card', columnId: 'done' });

    const res = await move(card._id, { columnId: 'todo', beforeId: a._id, afterId: b._id, version: 7 });

    expect(res.status).toBe(409);
    const bAfter = await TaskModel.findById(b._id).lean<Task>();
    expect(bAfter?.orderIndex).toBe(1000 + 1e-7);
  });
});
