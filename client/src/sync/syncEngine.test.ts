import { describe, expect, it, vi } from 'vitest';
import type { Op, Task } from '../types.ts';
import { createSyncEngine } from './syncEngine.ts';

const update = (opId: string, taskId: string): Op => ({ kind: 'update', opId, taskId, changes: { title: opId } });

// Each send() returns a promise the test settles by hand.
function controllableSend() {
  const calls: { op: Op; resolve: () => void; reject: (e: unknown) => void }[] = [];
  const send = vi.fn(
    (op: Op) =>
      new Promise<Task | null>((resolve, reject) => {
        calls.push({ op, resolve: () => resolve(null), reject });
      }),
  );
  return { send, calls };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('createSyncEngine', () => {
  it('sends ops for the same task one at a time, in order', async () => {
    const { send, calls } = controllableSend();
    const onSuccess = vi.fn();
    const engine = createSyncEngine({ send, onSuccess, onError: vi.fn() });

    engine.enqueue(update('1', 'a'));
    engine.enqueue(update('2', 'a'));
    await flush();
    expect(send).toHaveBeenCalledTimes(1);

    calls[0].resolve();
    await flush();
    expect(send).toHaveBeenCalledTimes(2);
    expect(calls[1].op.opId).toBe('2');
  });

  it('sends ops for different tasks in parallel', async () => {
    const { send } = controllableSend();
    const engine = createSyncEngine({ send, onSuccess: vi.fn(), onError: vi.fn() });

    engine.enqueue(update('1', 'a'));
    engine.enqueue(update('2', 'b'));
    await flush();

    expect(send).toHaveBeenCalledTimes(2);
  });

  it('reports a failure and still sends the next op for that task', async () => {
    const { send, calls } = controllableSend();
    const onError = vi.fn();
    const onSuccess = vi.fn();
    const engine = createSyncEngine({ send, onSuccess, onError });

    engine.enqueue(update('1', 'a'));
    engine.enqueue(update('2', 'a'));
    await flush();
    calls[0].reject(new Error('500'));
    await flush();
    calls[1].resolve();
    await flush();

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ opId: '1' }), expect.any(Error));
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ opId: '2' }), null);
    expect(send).toHaveBeenCalledTimes(2); // no automatic retry
  });
});
