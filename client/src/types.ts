// Mirrors server/src/models/Task.ts. There is no shared package, so these must be
// kept in sync by hand (a deliberate trade-off for a two-workspace repo).
export const PRIORITIES = ['low', 'medium', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const COLUMNS = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
] as const;
export type ColumnId = (typeof COLUMNS)[number]['id'];

export interface Task {
  _id: string;
  title: string;
  description: string;
  priority: Priority;
  columnId: ColumnId;
  orderIndex: number;
  tags: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type TaskChanges = Partial<Pick<Task, 'title' | 'description' | 'priority' | 'tags'>>;

// An optimistic change not yet confirmed by the server. The UI shows
// confirmed state with every pending op applied on top, in order.
export type Op =
  | { kind: 'create'; opId: string; task: Task }
  | { kind: 'update'; opId: string; taskId: string; changes: TaskChanges }
  | { kind: 'move'; opId: string; taskId: string; columnId: ColumnId; orderIndex: number }
  | { kind: 'delete'; opId: string; taskId: string };

export type TasksById = Record<string, Task>;
export type BoardColumns = Record<ColumnId, string[]>;

// Where a card should land: its column and the cards directly above (beforeId) and
// below (afterId) it, null at the edges. Same shape the move endpoint expects.
export interface Placement {
  columnId: ColumnId;
  beforeId: string | null;
  afterId: string | null;
}

export interface BoardView {
  tasksById: TasksById;
  columns: BoardColumns;
}
