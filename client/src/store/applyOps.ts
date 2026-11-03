import { type BoardView, type ColumnId, type Op, type Task, type TasksById } from '../types.ts';

// Returns a new record; never mutates `tasks`. Ops on a task that no longer exists
// (e.g. deleted by someone else) are skipped.
function applyOp(tasks: TasksById, op: Op): TasksById {
  switch (op.kind) {
    case 'create':
      return { ...tasks, [op.task._id]: op.task };
    case 'update': {
      const task = tasks[op.taskId];
      return task ? { ...tasks, [op.taskId]: { ...task, ...op.changes } } : tasks;
    }
    case 'move': {
      const task = tasks[op.taskId];
      if (!task) return tasks;
      return { ...tasks, [op.taskId]: { ...task, columnId: op.columnId, orderIndex: op.orderIndex } };
    }
    case 'delete': {
      const rest = { ...tasks };
      delete rest[op.taskId];
      return rest;
    }
  }
}

// Same order as the server: orderIndex, then _id to break ties.
function compareTasks(a: Task, b: Task): number {
  if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
  return a._id < b._id ? -1 : 1;
}

function groupByColumn(tasks: TasksById): Record<ColumnId, string[]> {
  const columns: Record<ColumnId, string[]> = { todo: [], in_progress: [], done: [] };
  for (const task of Object.values(tasks).sort(compareTasks)) {
    columns[task.columnId].push(task._id);
  }
  return columns;
}

// Pure: what the user sees = server-confirmed state + every pending op, in order.
// Rolling back a failed op is just removing it from `pending` and recomputing,
// so later ops on the same card are kept.
export function applyOps(confirmed: TasksById, pending: Op[]): BoardView {
  const tasksById = pending.reduce(applyOp, confirmed);
  return { tasksById, columns: groupByColumn(tasksById) };
}
