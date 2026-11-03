import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api/tasks.ts';
import type { Task } from '../types.ts';
import { useBoardStore } from './boardStore.ts';

vi.mock('../api/tasks.ts');

const initialState = useBoardStore.getState();

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

// A promise the test resolves or rejects by hand, to inspect the in-flight state.
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
const fields = { title: 'New card', description: '', priority: 'high' as const, tags: [] };

beforeEach(async () => {
  vi.resetAllMocks();
  useBoardStore.setState(initialState, true);
  vi.mocked(api.fetchTasks).mockResolvedValue([serverTask()]);
  await store().loadTasks();
});

describe('boardStore', () => {
  it('shows a created card immediately, then swaps in the server copy', async () => {
    const response = deferred<Task>();
    vi.mocked(api.createTask).mockReturnValue(response.promise);

    const done = store().createTask('todo', fields);

    expect(store().view.columns.todo).toHaveLength(2);
    expect(store().pending).toHaveLength(1);

    const sent = vi.mocked(api.createTask).mock.calls[0][0];
    response.resolve(serverTask({ _id: sent._id, title: 'New card', orderIndex: 2000, version: 0 }));
    await done;

    expect(store().pending).toHaveLength(0);
    expect(store().confirmed[sent._id]).toMatchObject({ title: 'New card' });
  });

  it('removes a created card again when the request fails', async () => {
    vi.mocked(api.createTask).mockRejectedValue(new Error('500'));

    await expect(store().createTask('todo', fields)).rejects.toThrow('500');

    expect(store().view.columns.todo).toEqual(['a']);
    expect(store().pending).toHaveLength(0);
  });

  it('puts a deleted card back when the delete fails', async () => {
    const response = deferred<null>();
    vi.mocked(api.deleteTask).mockReturnValue(response.promise);

    const done = store().deleteTask('a');
    expect(store().view.columns.todo).toEqual([]);

    response.reject(new Error('offline'));
    await expect(done).rejects.toThrow('offline');

    expect(store().view.columns.todo).toEqual(['a']);
  });

  it('sends the confirmed version and stores the server result', async () => {
    vi.mocked(api.updateTask).mockResolvedValue(serverTask({ title: 'Renamed', version: 4 }));

    await store().updateTask('a', { title: 'Renamed' });

    expect(api.updateTask).toHaveBeenCalledWith('a', { title: 'Renamed' }, 3);
    expect(store().view.tasksById.a).toMatchObject({ title: 'Renamed', version: 4 });
  });

  it('reports a load failure without throwing', async () => {
    vi.mocked(api.fetchTasks).mockRejectedValue(new Error('Network error'));

    await store().loadTasks();

    expect(store().status).toBe('error');
    expect(store().loadError).toBe('Network error');
  });
});
