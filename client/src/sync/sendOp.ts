import * as api from '../api/tasks.ts';
import type { Op, Task } from '../types.ts';

// Turns an op into its HTTP request. `versionOf` is called here, when the request
// is actually sent, so it sees the version from the previous op's response.
// Resolves to the server's copy of the task, or null after a delete.
export async function sendOp(op: Op, versionOf: (taskId: string) => number): Promise<Task | null> {
  switch (op.kind) {
    case 'create': {
      const { _id, title, description, priority, tags, columnId } = op.task;
      return api.createTask({ _id, title, description, priority, tags, columnId });
    }
    case 'update':
      return api.updateTask(op.taskId, op.changes, versionOf(op.taskId));
    case 'move': {
      const placement = { columnId: op.columnId, beforeId: op.beforeId, afterId: op.afterId };
      const { task } = await api.moveTask(op.taskId, placement, versionOf(op.taskId));
      return task;
    }
    case 'delete':
      return api.deleteTask(op.taskId);
  }
}
