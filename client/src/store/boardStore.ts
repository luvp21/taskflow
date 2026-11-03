import { create } from 'zustand';
import * as api from '../api/tasks.ts';
import { errorMessage } from '../api/http.ts';
import { computeOrderIndex } from '../lib/ordering.ts';
import type { BoardView, ColumnId, Op, Placement, Task, TaskChanges, TasksById } from '../types.ts';
import { applyOps } from './applyOps.ts';

type LoadStatus = 'loading' | 'error' | 'ready';

interface BoardState {
  confirmed: TasksById; // last state acknowledged by the server
  pending: Op[]; // optimistic ops still waiting for the server
  view: BoardView; // always applyOps(confirmed, pending)
  status: LoadStatus;
  loadError: string | null;
  loadTasks: () => Promise<void>;
  createTask: (columnId: ColumnId, fields: Required<TaskChanges>) => Promise<void>;
  updateTask: (id: string, changes: TaskChanges) => Promise<void>;
  moveTask: (id: string, placement: Placement) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

function withTask(tasks: TasksById, task: Task): TasksById {
  return { ...tasks, [task._id]: task };
}

function withoutTask(tasks: TasksById, id: string): TasksById {
  const rest = { ...tasks };
  delete rest[id];
  return rest;
}

const taskIdOf = (op: Op) => (op.kind === 'create' ? op.task._id : op.taskId);

export const useBoardStore = create<BoardState>()((set, get) => {
  // The only way confirmed/pending change, so `view` can never be out of date.
  function setBoard(confirmed: TasksById, pending: Op[]) {
    set({ confirmed, pending, view: applyOps(confirmed, pending) });
  }

  // Shows the op immediately, then sends it. `send` resolves to the server's copy
  // of the task, or null when the task was deleted.
  // Success: the server copy goes into confirmed and the op is dropped.
  // Failure: only this op is dropped, so only this change disappears from the view.
  async function runOp(op: Op, send: () => Promise<Task | null>) {
    setBoard(get().confirmed, [...get().pending, op]);
    const withoutOp = () => get().pending.filter((p) => p.opId !== op.opId);

    try {
      const saved = await send();
      const { confirmed } = get();
      setBoard(saved ? withTask(confirmed, saved) : withoutTask(confirmed, taskIdOf(op)), withoutOp());
    } catch (error) {
      setBoard(get().confirmed, withoutOp());
      throw error;
    }
  }

  // Read when the request is sent, not when the user acted, so it's never stale.
  function confirmedVersion(id: string): number {
    const task = get().confirmed[id];
    if (!task) throw new Error('This card is still being saved. Try again in a moment.');
    return task.version;
  }

  function lastOrderIndex(columnId: ColumnId): number | null {
    const { columns, tasksById } = get().view;
    const lastId = columns[columnId].at(-1);
    return lastId ? tasksById[lastId].orderIndex : null;
  }

  return {
    confirmed: {},
    pending: [],
    view: applyOps({}, []),
    status: 'loading',
    loadError: null,

    async loadTasks() {
      set({ status: 'loading', loadError: null });
      try {
        const tasks = await api.fetchTasks();
        setBoard(Object.fromEntries(tasks.map((task) => [task._id, task])), get().pending);
        set({ status: 'ready' });
      } catch (error) {
        set({ status: 'error', loadError: errorMessage(error) });
      }
    },

    async createTask(columnId, fields) {
      const now = new Date().toISOString();
      const task: Task = {
        _id: crypto.randomUUID(),
        ...fields,
        columnId,
        orderIndex: computeOrderIndex(lastOrderIndex(columnId), null),
        version: 0,
        createdAt: now,
        updatedAt: now,
      };
      await runOp({ kind: 'create', opId: crypto.randomUUID(), task }, () =>
        api.createTask({ _id: task._id, columnId, ...fields }),
      );
    },

    async updateTask(id, changes) {
      await runOp({ kind: 'update', opId: crypto.randomUUID(), taskId: id, changes }, () =>
        api.updateTask(id, changes, confirmedVersion(id)),
      );
    },

    // The optimistic orderIndex uses the same formula as the server, so the card
    // lands exactly where it was dropped. The server still decides the final index
    // from the neighbors as they are on the server.
    async moveTask(id, placement) {
      const { tasksById } = get().view;
      const indexOf = (taskId: string | null) => (taskId ? (tasksById[taskId]?.orderIndex ?? null) : null);
      const orderIndex = computeOrderIndex(indexOf(placement.beforeId), indexOf(placement.afterId));

      await runOp(
        { kind: 'move', opId: crypto.randomUUID(), taskId: id, columnId: placement.columnId, orderIndex },
        async () => (await api.moveTask(id, placement, confirmedVersion(id))).task,
      );
    },

    async deleteTask(id) {
      await runOp({ kind: 'delete', opId: crypto.randomUUID(), taskId: id }, async () => {
        await api.deleteTask(id);
        return null;
      });
    },
  };
});
