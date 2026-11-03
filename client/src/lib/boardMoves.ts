import { arrayMove } from '@dnd-kit/sortable';
import { COLUMNS, type BoardColumns, type ColumnId, type Placement } from '../types.ts';

export type MoveDirection = 'up' | 'down' | 'left' | 'right';

const COLUMN_IDS: readonly ColumnId[] = COLUMNS.map((column) => column.id);

function isColumnId(id: string): id is ColumnId {
  return (COLUMN_IDS as readonly string[]).includes(id);
}

// `id` is either a column id (dropped on the column itself) or a card id.
export function findColumn(columns: BoardColumns, id: string): ColumnId | null {
  if (isColumnId(id)) return id;
  return COLUMN_IDS.find((columnId) => columns[columnId].includes(id)) ?? null;
}

// The card's column and its neighbors in `columns`.
export function placementOf(columns: BoardColumns, id: string): Placement | null {
  const columnId = findColumn(columns, id);
  if (!columnId) return null;
  const ids = columns[columnId];
  const index = ids.indexOf(id);
  return { columnId, beforeId: ids[index - 1] ?? null, afterId: ids[index + 1] ?? null };
}

export function samePlacement(a: Placement | null, b: Placement | null): boolean {
  return a?.columnId === b?.columnId && a?.beforeId === b?.beforeId && a?.afterId === b?.afterId;
}

// Puts `activeId` where `overId` is (or at the end, if `overId` is a column).
// Returns new arrays; never mutates `columns`.
export function moveInPreview(columns: BoardColumns, activeId: string, overId: string): BoardColumns {
  const from = findColumn(columns, activeId);
  const to = findColumn(columns, overId);
  if (!from || !to || activeId === overId) return columns;

  const target = columns[to];
  const overIndex = target.indexOf(overId);

  if (from === to) {
    // Same as dnd-kit's sortable behavior: take the card out, insert it at the
    // index of the card it's over (so dragging down lands after that card).
    const newIndex = overIndex === -1 ? target.length - 1 : overIndex;
    return { ...columns, [to]: arrayMove(target, target.indexOf(activeId), newIndex) };
  }

  const insertAt = overIndex === -1 ? target.length : overIndex;
  return {
    ...columns,
    [from]: columns[from].filter((id) => id !== activeId),
    [to]: [...target.slice(0, insertAt), activeId, ...target.slice(insertAt)],
  };
}

// Where a "Move up/down/left/right" button puts the card. Left/right keep the same
// row when possible. Returns null when the card is already at that edge.
// `columnOrder` is the columns left/right can move between (the visible ones when
// a column filter is active).
export function stepPlacement(
  columns: BoardColumns,
  id: string,
  direction: MoveDirection,
  columnOrder: readonly ColumnId[] = COLUMN_IDS,
): Placement | null {
  const columnId = findColumn(columns, id);
  if (!columnId) return null;
  const ids = columns[columnId];
  const index = ids.indexOf(id);

  if (direction === 'up') {
    if (index === 0) return null;
    return { columnId, beforeId: ids[index - 2] ?? null, afterId: ids[index - 1] };
  }
  if (direction === 'down') {
    if (index === ids.length - 1) return null;
    return { columnId, beforeId: ids[index + 1], afterId: ids[index + 2] ?? null };
  }

  const targetColumn = columnOrder[columnOrder.indexOf(columnId) + (direction === 'left' ? -1 : 1)];
  if (!targetColumn) return null;
  const target = columns[targetColumn];
  const row = Math.min(index, target.length);
  return { columnId: targetColumn, beforeId: target[row - 1] ?? null, afterId: target[row] ?? null };
}
