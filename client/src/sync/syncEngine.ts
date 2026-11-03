import { opTaskId } from '../lib/ops.ts';
import type { Op, Task } from '../types.ts';

export interface SyncHandlers {
  send: (op: Op) => Promise<Task | null>;
  onSuccess: (op: Op, task: Task | null) => void;
  onError: (op: Op, error: unknown) => void;
  onReplaced: (replaced: Op) => void; // a queued move was superseded by a newer one
}

// Plain TypeScript, no React. One queue per task: an op for a task is sent only
// after that task's previous op has settled, so two requests for the same card are
// never in flight together (no out-of-order writes, and each request reads the
// version the previous one produced). Different tasks have separate queues, so
// they are sent in parallel. No automatic retries: a failure is reported once.
export function createSyncEngine({ send, onSuccess, onError, onReplaced }: SyncHandlers) {
  // The first op in each queue is the one currently in flight.
  const queues = new Map<string, Op[]>();

  async function settle(op: Op) {
    let task: Task | null;
    try {
      task = await send(op);
    } catch (error) {
      onError(op, error);
      return;
    }
    onSuccess(op, task);
  }

  async function runQueue(taskId: string) {
    let op = queues.get(taskId)?.[0];
    while (op) {
      await settle(op);
      const remaining = (queues.get(taskId) ?? []).slice(1);
      if (remaining.length === 0) queues.delete(taskId);
      else queues.set(taskId, remaining);
      op = remaining[0];
    }
  }

  // Coalescing: a move says "put the card HERE", so a newer move makes an older one
  // that hasn't been sent yet pointless. Only the last op can be replaced, and only
  // if it is waiting (index > 0); the in-flight op is never touched.
  function replacesQueuedMove(queue: Op[], op: Op): boolean {
    const last = queue.at(-1);
    return op.kind === 'move' && queue.length > 1 && last?.kind === 'move';
  }

  function enqueue(op: Op) {
    const taskId = opTaskId(op);
    const queue = queues.get(taskId) ?? [];

    if (replacesQueuedMove(queue, op)) {
      queues.set(taskId, [...queue.slice(0, -1), op]);
      onReplaced(queue[queue.length - 1]);
      return;
    }

    queues.set(taskId, [...queue, op]);
    if (queue.length === 0) void runQueue(taskId);
  }

  return { enqueue };
}
