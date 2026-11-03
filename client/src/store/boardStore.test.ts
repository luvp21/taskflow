import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/http.ts';
import * as api from '../api/tasks.ts';
import { opTaskId } from '../lib/ops.ts';
import type { Task } from '../types.ts';
import { useBoardStore } from './boardStore.ts';
import { useUiStore } from './uiStore.ts';

vi.mock('../api/tasks.ts');

const initialBoard = useBoardStore.getState();
const initialUi = useUiStore.getState();

function serverTask(overrides: Partial<Task> = {}): Task {
  return {
    _id: 'a',
    title: 'Existing',
    description: '',
    priority: 'medium',
    columnId: 'todo',
    orderIndex: 1000,
    tags: [],
    version: 3,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const store = () => useBoardStore.getState();
const toasts = () => useUiStore.getState().toasts.map((toast) => toast.message);
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const fields = { title: 'New card', description: '', priority: 'high' as const, tags: [] };

beforeEach(async () => {
  vi.resetAllMocks();
  useBoardStore.setState(initialBoard, true);
  useUiStore.setState(initialUi, true);
  vi.mocked(api.fetchTasks).mockResolvedValue([serverTask()]);
  await store().loadTasks();
});

describe('boardStore', () => {
  it('shows a created card immediately, then swaps in the server copy', async () => {
    const response = deferred<Task>();
    vi.mocked(api.createTask).mockReturnValue(response.promise);

    store().createTask('todo', fields);

    expect(store().view.columns.todo).toHaveLength(2);
    expect(store().pending).toHaveLength(1);

    const sent = vi.mocked(api.createTask).mock.calls[0][0];
    response.resolve(serverTask({ _id: sent._id, title: 'New card', orderIndex: 2000, version: 0 }));
    await flush();

    expect(store().pending).toHaveLength(0);
    expect(store().confirmed[sent._id]).toMatchObject({ title: 'New card' });
  });

  it('removes a failed create and names the card in a toast', async () => {
    vi.mocked(api.createTask).mockRejectedValue(new ApiError(500, 'Internal server error'));

    store().createTask('todo', fields);
    await flush();

    expect(store().view.columns.todo).toEqual(['a']);
    expect(toasts()).toEqual(['Couldn\'t create “New card”. Reverted.']);
  });

  it('puts a card back when its delete fails', async () => {
    vi.mocked(api.deleteTask).mockRejectedValue(new ApiError(0, 'Network error'));

    store().deleteTask('a');
    expect(store().view.columns.todo).toEqual([]);
    await flush();

    expect(store().view.columns.todo).toEqual(['a']);
    expect(toasts()).toEqual(['Couldn\'t delete “Existing”. Reverted.']);
  });

  it('on 409, shows the server copy and explains why', async () => {
    const current = serverTask({ title: 'Renamed by someone else', version: 4 });
    vi.mocked(api.updateTask).mockRejectedValue(new ApiError(409, 'Conflict', { error: 'Conflict', task: current }));

    store().updateTask('a', { title: 'My title' });
    await flush();

    expect(store().view.tasksById.a).toMatchObject({ title: 'Renamed by someone else', version: 4 });
    expect(toasts()).toEqual(['This card changed elsewhere. Showing the latest version.']);
  });

  it('queues an edit behind its own create and sends the version the create returned', async () => {
    const created = deferred<Task>();
    vi.mocked(api.createTask).mockReturnValue(created.promise);
    vi.mocked(api.updateTask).mockResolvedValue(serverTask());

    store().createTask('todo', fields);
    const id = opTaskId(store().pending[0]);
    store().updateTask(id, { title: 'Edited before the create finished' });
    await flush();
    expect(api.updateTask).not.toHaveBeenCalled();

    created.resolve(serverTask({ _id: id, version: 0 }));
    await flush();

    expect(api.updateTask).toHaveBeenCalledWith(id, { title: 'Edited before the create finished' }, 0);
  });

  it('moves a card between its new neighbors at once and sends the placement', async () => {
    vi.mocked(api.fetchTasks).mockResolvedValue([
      serverTask(),
      serverTask({ _id: 'x', columnId: 'done', orderIndex: 1000 }),
      serverTask({ _id: 'y', columnId: 'done', orderIndex: 2000 }),
    ]);
    await store().loadTasks();
    const response = deferred<api.MoveResult>();
    vi.mocked(api.moveTask).mockReturnValue(response.promise);
    const placement = { columnId: 'done' as const, beforeId: 'x', afterId: 'y' };

    store().moveTask('a', placement);
    await flush();

    expect(store().view.columns).toMatchObject({ todo: [], done: ['x', 'a', 'y'] });
    expect(store().view.tasksById.a.orderIndex).toBe(1500);
    expect(api.moveTask).toHaveBeenCalledWith('a', placement, 3);

    // The sync engine is a module-level singleton: settle the request so this
    // card's queue is empty for the next test.
    response.resolve({ task: serverTask({ columnId: 'done', orderIndex: 1500, version: 4 }), rebalanced: false });
    await flush();
  });

  it('five rapid moves of one card: pending keeps only the in-flight and the latest, and the card ends at the last move', async () => {
    const responses: ReturnType<typeof deferred<api.MoveResult>>[] = [];
    vi.mocked(api.moveTask).mockImplementation(() => {
      const response = deferred<api.MoveResult>();
      responses.push(response);
      return response.promise;
    });
    const columns = ['in_progress', 'done', 'todo', 'in_progress', 'done'] as const;

    for (const columnId of columns) store().moveTask('a', { columnId, beforeId: null, afterId: null });
    await flush();

    expect(store().pending).toHaveLength(2);
    expect(store().view.tasksById.a.columnId).toBe('done');

    responses[0].resolve({ task: serverTask({ columnId: 'in_progress', version: 4 }), rebalanced: false });
    await flush();
    expect(api.moveTask).toHaveBeenLastCalledWith('a', { columnId: 'done', beforeId: null, afterId: null }, 4);
    responses[1].resolve({ task: serverTask({ columnId: 'done', version: 5 }), rebalanced: false });
    await flush();

    expect(api.moveTask).toHaveBeenCalledTimes(2);
    expect(store().pending).toHaveLength(0);
    expect(store().view.tasksById.a).toMatchObject({ columnId: 'done', version: 5 });
  });

  it('reports a load failure without throwing', async () => {
    vi.mocked(api.fetchTasks).mockRejectedValue(new Error('Network error'));

    await store().loadTasks();

    expect(store().status).toBe('error');
    expect(store().loadError).toBe('Network error');
  });
});
