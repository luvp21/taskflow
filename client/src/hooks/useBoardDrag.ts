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
import { useRef, useState } from 'react';
import { findColumn, moveInPreview, placementOf, samePlacement } from '../lib/boardMoves.ts';
import { visibleColumns } from '../lib/filters.ts';
import { useBoardStore } from '../store/boardStore.ts';
import { useUiStore } from '../store/uiStore.ts';
import type { BoardColumns, Placement } from '../types.ts';

// Moving 5px before a drag starts lets a plain click still open the card.
const DRAG_DISTANCE_PX = 5;

// While dragging, the cross-column preview lives HERE (local state), not in the
// store: dragging over columns fires many events, but the store, the pending list
// and the server get exactly one move, on drop. Cancel just throws the preview away.
//
// The preview is built from the VISIBLE cards, so with filters on the neighbors sent
// to the server are the visible ones. That is still a correct global position: the
// new index lies between two visible cards, and hidden cards keep their own order.
export function useBoardDrag() {
  const [preview, setPreview] = useState<BoardColumns | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Where the card started, in the same (visible) terms as the preview, to detect
  // drops that end where they began. Not rendered, so a ref.
  const startPlacement = useRef<Placement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_DISTANCE_PX } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function reset() {
    setPreview(null);
    setActiveId(null);
  }

  function handleDragStart({ active }: DragStartEvent) {
    const id = String(active.id);
    const columns = visibleColumns(useBoardStore.getState().view, useUiStore.getState().filters);
    startPlacement.current = placementOf(columns, id);
    setActiveId(id);
    setPreview(columns);
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

    const placement = placementOf(finalColumns, id);
    if (!placement || samePlacement(placement, startPlacement.current)) return;

    useBoardStore.getState().moveTask(id, placement);
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
