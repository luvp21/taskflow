import { describe, expect, it } from 'vitest';
import type { Op, Task, TasksById } from '../types.ts';
import { applyOps } from './applyOps.ts';

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    _id: id,
    title: id,
    description: '',
    priority: 'medium',
    columnId: 'todo',
    orderIndex: 1000,
    tags: [],
    version: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const byId = (...tasks: Task[]): TasksById => Object.fromEntries(tasks.map((t) => [t._id, t]));

describe('applyOps', () => {
  it('groups confirmed tasks by column, sorted by orderIndex then _id', () => {
    const confirmed = byId(
      task('b', { orderIndex: 1000 }),
      task('c', { orderIndex: 500 }),
      task('a', { orderIndex: 1000 }),
      task('d', { columnId: 'done' }),
    );

    const view = applyOps(confirmed, []);

    expect(view.columns).toEqual({ todo: ['c', 'a', 'b'], in_progress: [], done: ['d'] });
  });

  it('applies create, update, move and delete on top of confirmed state', () => {
    const confirmed = byId(task('a'), task('b', { orderIndex: 2000 }));
    const pending: Op[] = [
      { kind: 'create', opId: '1', task: task('new', { orderIndex: 3000 }) },
      { kind: 'update', opId: '2', taskId: 'a', changes: { title: 'Renamed' } },
      { kind: 'move', opId: '3', taskId: 'b', columnId: 'done', orderIndex: 1000, beforeId: null, afterId: null },
      { kind: 'delete', opId: '4', taskId: 'a' },
    ];

    const view = applyOps(confirmed, pending);

    expect(view.columns).toEqual({ todo: ['new'], in_progress: [], done: ['b'] });
    expect(view.tasksById.a).toBeUndefined();
  });

  it('never mutates confirmed state', () => {
    const confirmed = byId(task('a'));
    const snapshot = structuredClone(confirmed);

    applyOps(confirmed, [
      { kind: 'update', opId: '1', taskId: 'a', changes: { title: 'x' } },
      { kind: 'delete', opId: '2', taskId: 'a' },
    ]);

    expect(confirmed).toEqual(snapshot);
  });

  it('keeps unchanged tasks as the same object, so memoized cards skip re-rendering', () => {
    const confirmed = byId(task('a'), task('b'));

    const view = applyOps(confirmed, [
      { kind: 'update', opId: '1', taskId: 'a', changes: { title: 'x' } },
    ]);

    expect(view.tasksById.b).toBe(confirmed.b);
    expect(view.tasksById.a).not.toBe(confirmed.a);
  });

  it('removing one op undoes only that op (rollback without snapshots)', () => {
    const confirmed = byId(task('a'));
    const first: Op = { kind: 'update', opId: '1', taskId: 'a', changes: { title: 'First' } };
    const second: Op = { kind: 'update', opId: '2', taskId: 'a', changes: { priority: 'high' } };

    const view = applyOps(confirmed, [second]);

    expect(view.tasksById.a).toMatchObject({ title: 'a', priority: 'high' });
    expect(applyOps(confirmed, [first, second]).tasksById.a).toMatchObject({
      title: 'First',
      priority: 'high',
    });
  });

  it('two moves of one card in flight, the first fails: the card shows the second move', () => {
    const confirmed = byId(task('a'), task('x', { columnId: 'done' }));
    const firstMove: Op = { kind: 'move', opId: '1', taskId: 'a', columnId: 'in_progress', orderIndex: 1000, beforeId: null, afterId: null };
    const secondMove: Op = { kind: 'move', opId: '2', taskId: 'a', columnId: 'done', orderIndex: 2000, beforeId: 'x', afterId: null };

    // The first move failed, so only it is removed from pending.
    const view = applyOps(confirmed, [secondMove]);

    expect(view.columns).toEqual({ todo: [], in_progress: [], done: ['x', 'a'] });
    expect(applyOps(confirmed, [firstMove, secondMove]).columns).toEqual(view.columns);
  });

  it('create then failed create: the card disappears', () => {
    const confirmed = byId(task('a'));
    const create: Op = { kind: 'create', opId: '1', task: task('new', { orderIndex: 2000 }) };

    expect(applyOps(confirmed, [create]).columns.todo).toEqual(['a', 'new']);
    expect(applyOps(confirmed, []).columns.todo).toEqual(['a']);
  });

  it('delete fails: the card reappears in its old position', () => {
    const confirmed = byId(task('a', { orderIndex: 1000 }), task('b', { orderIndex: 2000 }), task('c', { orderIndex: 3000 }));
    const remove: Op = { kind: 'delete', opId: '1', taskId: 'b' };

    expect(applyOps(confirmed, [remove]).columns.todo).toEqual(['a', 'c']);
    expect(applyOps(confirmed, []).columns.todo).toEqual(['a', 'b', 'c']);
  });

  it('skips ops on a task that no longer exists', () => {
    const view = applyOps({}, [
      { kind: 'update', opId: '1', taskId: 'gone', changes: { title: 'x' } },
      { kind: 'move', opId: '2', taskId: 'gone', columnId: 'done', orderIndex: 1, beforeId: null, afterId: null },
    ]);

    expect(view.tasksById).toEqual({});
  });
});
