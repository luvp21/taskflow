import { COLUMNS, type BoardColumns, type BoardView, type ColumnId, type Priority, type Task } from '../types.ts';

export interface Filters {
  query: string; // already debounced
  priorities: Priority[]; // empty = any priority
  columns: ColumnId[]; // empty = every column
}

export const NO_FILTERS: Filters = { query: '', priorities: [], columns: [] };

export function isFiltering({ query, priorities, columns }: Filters): boolean {
  return query.trim() !== '' || priorities.length > 0 || columns.length > 0;
}

// Within a group the chips are OR (High OR Medium); across groups they are AND
// (priority matches AND text matches). The column group is applied per column.
export function matchesFilters(task: Task, { query, priorities }: Filters): boolean {
  if (priorities.length > 0 && !priorities.includes(task.priority)) return false;
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return task.title.toLowerCase().includes(needle) || task.description.toLowerCase().includes(needle);
}

// Columns to render, in board order. No column chips selected = all of them.
export function visibleColumnIds({ columns }: Filters): ColumnId[] {
  return COLUMNS.map((column) => column.id).filter((id) => columns.length === 0 || columns.includes(id));
}

// The ids of one column that pass the filters. Derived on every render; the store
// itself is never changed by filtering.
export function visibleIdsIn(view: BoardView, columnId: ColumnId, filters: Filters): string[] {
  if (!visibleColumnIds(filters).includes(columnId)) return [];
  return view.columns[columnId].filter((id) => matchesFilters(view.tasksById[id], filters));
}

export function visibleColumns(view: BoardView, filters: Filters): BoardColumns {
  return {
    todo: visibleIdsIn(view, 'todo', filters),
    in_progress: visibleIdsIn(view, 'in_progress', filters),
    done: visibleIdsIn(view, 'done', filters),
  };
}

// Where the query appears in `text`, for highlighting. Case-insensitive.
export function findMatch(text: string, query: string): { start: number; end: number } | null {
  const needle = query.trim().toLowerCase();
  if (!needle) return null;
  const start = text.toLowerCase().indexOf(needle);
  return start === -1 ? null : { start, end: start + needle.length };
}
