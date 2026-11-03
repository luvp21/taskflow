import type { Announcements, UniqueIdentifier } from '@dnd-kit/core';
import { useBoardStore } from '../store/boardStore.ts';
import { COLUMNS } from '../types.ts';

// dnd-kit reads these to screen readers during a drag. Its defaults would read out
// the card's UUID, so we describe cards by title and columns by name instead.
function describe(id: UniqueIdentifier): string {
  const column = COLUMNS.find((c) => c.id === id);
  if (column) return `the ${column.title} column`;
  const task = useBoardStore.getState().view.tasksById[String(id)];
  return task ? `“${task.title}”` : 'a card';
}

export const dragAnnouncements: Announcements = {
  onDragStart: ({ active }) => `Picked up ${describe(active.id)}.`,
  onDragOver: ({ active, over }) =>
    over ? `${describe(active.id)} is over ${describe(over.id)}.` : `${describe(active.id)} is not over a column.`,
  onDragEnd: ({ active, over }) =>
    over ? `${describe(active.id)} was dropped near ${describe(over.id)}.` : `${describe(active.id)} was dropped.`,
  onDragCancel: ({ active }) => `Moving ${describe(active.id)} was cancelled.`,
};
