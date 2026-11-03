import * as api from '../api/tasks.ts';
import type { Op } from '../types.ts';
import type { SendResult } from './syncEngine.ts';

// Turns an op into its HTTP request. `versionOf` is called here, when the request
// is actually sent, so it sees the version from the previous op's response.
export async function sendOp(op: Op, versionOf: (taskId: string) => number): Promise<SendResult> {
  switch (op.kind) {
    case 'create': {
      const { _id, title, description, priority, tags, columnId } = op.task;
      const task = await api.createTask({ _id, title, description, priority, tags, columnId });
      return { task, rebalanced: false };
    }
    case 'update': {
      const task = await api.updateTask(op.taskId, op.changes, versionOf(op.taskId));
      return { task, rebalanced: false };
    }
    case 'move': {
      const placement = { columnId: op.columnId, beforeId: op.beforeId, afterId: op.afterId };
      return api.moveTask(op.taskId, placement, versionOf(op.taskId));
    }
    case 'delete':
      await api.deleteTask(op.taskId);
      return { task: null, rebalanced: false };
  }
}
