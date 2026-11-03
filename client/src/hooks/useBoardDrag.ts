import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useState } from 'react';
import { findColumn, moveInPreview, placementOf, samePlacement } from '../lib/boardMoves.ts';
import { useBoardStore } from '../store/boardStore.ts';
import type { BoardColumns } from '../types.ts';

// Moving 5px before a drag starts lets a plain click still open the card.
const DRAG_DISTANCE_PX = 5;

// While dragging, the cross-column preview lives HERE (local state), not in the
// store: dragging over columns fires many events, but the store, the pending list
// and the server get exactly one move, on drop. Cancel just throws the preview away.
export function useBoardDrag() {
  const [preview, setPreview] = useState<BoardColumns | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_DISTANCE_PX } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function reset() {
    setPreview(null);
    setActiveId(null);
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
    setPreview(useBoardStore.getState().view.columns);
  }

  // Only cross-column moves change the preview here. Reordering inside a column is
  // animated by SortableContext and applied once, on drop.
  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const id = String(active.id);
    const overId = String(over.id);
    setPreview((current) => {
      if (!current) return current;
      const from = findColumn(current, id);
      const to = findColumn(current, overId);
      return from && to && from !== to ? moveInPreview(current, id, overId) : current;
    });
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const id = String(active.id);
    const finalColumns = preview && over ? moveInPreview(preview, id, String(over.id)) : null;
    reset();
    if (!finalColumns) return;

    const { view, moveTask } = useBoardStore.getState();
    const placement = placementOf(finalColumns, id);
    if (!placement || samePlacement(placement, placementOf(view.columns, id))) return;

    moveTask(id, placement);
  }

  return {
    preview,
    activeId,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel: reset,
  };
}
