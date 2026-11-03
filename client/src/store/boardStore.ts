import { create } from 'zustand';
import { ApiError, errorMessage } from '../api/http.ts';
import * as api from '../api/tasks.ts';
import { failureMessage, opTaskId } from '../lib/ops.ts';
import { computeOrderIndex } from '../lib/ordering.ts';
import { sendOp } from '../sync/sendOp.ts';
import { createSyncEngine } from '../sync/syncEngine.ts';
import type { BoardView, ColumnId, Op, Placement, Task, TaskChanges, TasksById } from '../types.ts';
import { applyOps } from './applyOps.ts';
import { useUiStore } from './uiStore.ts';

type LoadStatus = 'loading' | 'error' | 'ready';

interface BoardState {
  confirmed: TasksById; // last state acknowledged by the server
  pending: Op[]; // optimistic ops still waiting for the server
  view: BoardView; // always applyOps(confirmed, pending)
  status: LoadStatus;
  loadError: string | null;
  loadTasks: () => Promise<void>;
  createTask: (columnId: ColumnId, fields: Required<TaskChanges>) => void;
  updateTask: (id: string, changes: TaskChanges) => void;
  moveTask: (id: string, placement: Placement) => void;
  deleteTask: (id: string) => void;
}

// Actions only describe the change as an op and dispatch it. The UI updates at
// once; the server round trip happens in the sync engine.
export const useBoardStore = create<BoardState>()((set, get) => ({
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

  createTask(columnId, fields) {
    const lastId = get().view.columns[columnId].at(-1);
    const now = new Date().toISOString();
    const task: Task = {
      _id: crypto.randomUUID(),
      ...fields,
      columnId,
      orderIndex: computeOrderIndex(orderIndexOf(lastId ?? null), null),
      version: 0,
      createdAt: now,
      updatedAt: now,
    };
    dispatch({ kind: 'create', opId: crypto.randomUUID(), task });
  },

  updateTask(id, changes) {
    dispatch({ kind: 'update', opId: crypto.randomUUID(), taskId: id, changes });
  },

  // Same formula as the server, so the card shows exactly where it was dropped.
  // The server recomputes from its own neighbors and its value replaces this one.
  moveTask(id, placement) {
    const orderIndex = computeOrderIndex(orderIndexOf(placement.beforeId), orderIndexOf(placement.afterId));
    dispatch({ kind: 'move', opId: crypto.randomUUID(), taskId: id, orderIndex, ...placement });
  },

  deleteTask(id) {
    dispatch({ kind: 'delete', opId: crypto.randomUUID(), taskId: id });
  },
}));

const getBoard = () => useBoardStore.getState();
const showToast = (message: string) => useUiStore.getState().showToast(message);

// The only way confirmed/pending change, so `view` can never be out of date.
function setBoard(confirmed: TasksById, pending: Op[]) {
  useBoardStore.setState({ confirmed, pending, view: applyOps(confirmed, pending) });
}

function withTask(tasks: TasksById, task: Task): TasksById {
  return { ...tasks, [task._id]: task };
}

function withoutTask(tasks: TasksById, id: string): TasksById {
  const rest = { ...tasks };
  delete rest[id];
  return rest;
}

function orderIndexOf(taskId: string | null): number | null {
  return taskId ? (getBoard().view.tasksById[taskId]?.orderIndex ?? null) : null;
}

// Drops one op (and optionally updates confirmed). Every other pending op stays,
// so a rollback undoes only this change, never a later one.
function removeOp(opId: string, confirmed: TasksById = getBoard().confirmed) {
  setBoard(confirmed, getBoard().pending.filter((op) => op.opId !== opId));
}

function confirmedVersion(taskId: string): number {
  const task = getBoard().confirmed[taskId];
  if (!task) throw new Error('This card no longer exists on the server');
  return task.version;
}

function titleOf(op: Op): string {
  if (op.kind === 'create') return op.task.title;
  const { view, confirmed } = getBoard();
  return (view.tasksById[op.taskId] ?? confirmed[op.taskId])?.title ?? 'card';
}

// A 409 response carries the server's current copy of the task.
function conflictTask(error: unknown): Task | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const body = error.body;
  return body && typeof body === 'object' && 'task' in body ? (body.task as Task) : null;
}

function handleSuccess(op: Op, task: Task | null) {
  const { confirmed } = getBoard();
  removeOp(op.opId, task ? withTask(confirmed, task) : withoutTask(confirmed, opTaskId(op)));
}

function handleError(op: Op, error: unknown) {
  const title = titleOf(op); // read before the op is removed
  const { confirmed } = getBoard();

  const serverTask = conflictTask(error);
  if (serverTask) {
    removeOp(op.opId, withTask(confirmed, serverTask));
    showToast('This card changed elsewhere. Showing the latest version.');
    return;
  }
  if (error instanceof ApiError && error.status === 404) {
    removeOp(op.opId, withoutTask(confirmed, opTaskId(op)));
    // Deleting something already deleted is fine: the end result is what the user wanted.
    if (op.kind !== 'delete') showToast(`“${title}” was deleted elsewhere.`);
    return;
  }
  removeOp(op.opId);
  showToast(failureMessage(op, title));
}

const engine = createSyncEngine({
  send: (op) => sendOp(op, confirmedVersion),
  onSuccess: handleSuccess,
  onError: handleError,
});

function dispatch(op: Op) {
  const { confirmed, pending } = getBoard();
  setBoard(confirmed, [...pending, op]);
  engine.enqueue(op);
}
