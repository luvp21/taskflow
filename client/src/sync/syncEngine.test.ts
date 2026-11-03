import { describe, expect, it, vi } from 'vitest';
import type { Op } from '../types.ts';
import { createSyncEngine, type SendResult } from './syncEngine.ts';

const update = (opId: string, taskId: string): Op => ({ kind: 'update', opId, taskId, changes: { title: opId } });
const move = (opId: string, taskId: string): Op => ({
  kind: 'move',
  opId,
  taskId,
  columnId: 'done',
  orderIndex: Number(opId),
  beforeId: null,
  afterId: null,
});
const noop = () => {};

// Each send() returns a promise the test settles by hand.
function controllableSend() {
  const calls: { op: Op; resolve: () => void; reject: (e: unknown) => void }[] = [];
  const send = vi.fn(
    (op: Op) =>
      new Promise<SendResult>((resolve, reject) => {
        calls.push({ op, resolve: () => resolve({ task: null, rebalanced: false }), reject });
      }),
  );
  return { send, calls };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('createSyncEngine', () => {
  it('sends ops for the same task one at a time, in order', async () => {
    const { send, calls } = controllableSend();
    const onSuccess = vi.fn();
    const engine = createSyncEngine({ send, onSuccess, onError: vi.fn(), onReplaced: noop });

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
    const engine = createSyncEngine({ send, onSuccess: vi.fn(), onError: vi.fn(), onReplaced: noop });

    engine.enqueue(update('1', 'a'));
    engine.enqueue(update('2', 'b'));
    await flush();

    expect(send).toHaveBeenCalledTimes(2);
  });

  it('reports a failure and still sends the next op for that task', async () => {
    const { send, calls } = controllableSend();
    const onError = vi.fn();
    const onSuccess = vi.fn();
    const engine = createSyncEngine({ send, onSuccess, onError, onReplaced: noop });

    engine.enqueue(update('1', 'a'));
    engine.enqueue(update('2', 'a'));
    await flush();
    calls[0].reject(new Error('500'));
    await flush();
    calls[1].resolve();
    await flush();

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ opId: '1' }), expect.any(Error));
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ opId: '2' }), { task: null, rebalanced: false });
    expect(send).toHaveBeenCalledTimes(2); // no automatic retry
  });

  it('five rapid moves of one card with a slow server send only 2 requests, ending with the last move', async () => {
    const { send, calls } = controllableSend();
    const onReplaced = vi.fn();
    const engine = createSyncEngine({ send, onSuccess: vi.fn(), onError: vi.fn(), onReplaced });

    for (const id of ['1', '2', '3', '4', '5']) engine.enqueue(move(id, 'a'));
    await flush();
    calls[0].resolve();
    await flush();
    calls[1].resolve();
    await flush();

    expect(send).toHaveBeenCalledTimes(2);
    expect(calls.map((call) => call.op.opId)).toEqual(['1', '5']);
    expect(onReplaced.mock.calls.map(([op]) => op.opId)).toEqual(['2', '3', '4']);
  });

  it('never replaces the in-flight move, or a queued op that is not a move', async () => {
    const { send, calls } = controllableSend();
    const onReplaced = vi.fn();
    const engine = createSyncEngine({ send, onSuccess: vi.fn(), onError: vi.fn(), onReplaced });

    engine.enqueue(move('1', 'a'));
    engine.enqueue(move('2', 'a')); // queued behind the in-flight move 1
    engine.enqueue(update('3', 'a'));
    engine.enqueue(move('4', 'a')); // last queued op is an update, so it can't be replaced
    await flush();
    for (let i = 0; i < 4; i++) {
      calls[i].resolve();
      await flush();
    }

    expect(calls.map((call) => call.op.opId)).toEqual(['1', '2', '3', '4']);
    expect(onReplaced).not.toHaveBeenCalled();
  });
});
