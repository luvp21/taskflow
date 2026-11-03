import type { Task, TasksById } from '../types.ts';

// Combines a fresh GET /api/tasks with what we already have. The fetch is the
// source of truth (cards deleted elsewhere disappear, rebalanced indexes arrive),
// except where our copy has a HIGHER version: one of our own writes finished after
// the fetch was read on the server, so ours is newer.
export function mergeFetched(current: TasksById, fetched: Task[]): TasksById {
  return Object.fromEntries(
    fetched.map((task) => {
      const mine = current[task._id];
      return [task._id, mine && mine.version > task.version ? mine : task];
    }),
  );
}
