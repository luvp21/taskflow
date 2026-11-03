import { closestCorners, DndContext, DragOverlay } from '@dnd-kit/core';
import { useCallback, useEffect, useState } from 'react';
import { useBoardDrag } from '../hooks/useBoardDrag.ts';
import { useVisibleColumnIds } from '../hooks/useFilteredView.ts';
import { dragAnnouncements } from '../lib/dragAnnouncements.ts';
import { useBoardStore } from '../store/boardStore.ts';
import { COLUMNS, type ColumnId } from '../types.ts';
import { BoardError, BoardSkeleton } from './BoardStatus.tsx';
import { Column } from './Column.tsx';
import { TaskCardOverlay } from './TaskCardBody.tsx';
import { TaskModal, type ModalTarget } from './TaskModal.tsx';

export function Board() {
  const status = useBoardStore((state) => state.status);
  const loadError = useBoardStore((state) => state.loadError);
  const loadTasks = useBoardStore((state) => state.loadTasks);
  const [modal, setModal] = useState<ModalTarget | null>(null);
  const drag = useBoardDrag();
  const columnIds = useVisibleColumnIds();
  const activeTask = useBoardStore((state) => (drag.activeId ? state.view.tasksById[drag.activeId] : undefined));

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  // Stable function identities (useCallback with no deps), so memoized TaskCards
  // don't re-render just because Board did.
  const openCreate = useCallback((columnId: ColumnId) => setModal({ mode: 'create', columnId }), []);
  const openEdit = useCallback((taskId: string) => setModal({ mode: 'edit', taskId }), []);
  const closeModal = useCallback(() => setModal(null), []);

  if (status === 'loading') return <BoardSkeleton />;
  if (status === 'error') {
    return <BoardError message={loadError ?? 'Unknown error'} onRetry={() => void loadTasks()} />;
  }

  // closestCorners works better than the default for stacked lists in several
  // columns: it picks the card or column whose corners are nearest the dragged card.
  return (
    <DndContext
      sensors={drag.sensors}
      collisionDetection={closestCorners}
      accessibility={{ announcements: dragAnnouncements }}
      onDragStart={drag.handleDragStart}
      onDragOver={drag.handleDragOver}
      onDragEnd={drag.handleDragEnd}
      onDragCancel={drag.handleDragCancel}
    >
      {/* Phones: columns side by side with horizontal scroll and snap. md+: the visible
          columns share the width, so hiding one with a filter widens the others. */}
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 md:snap-none">
        {COLUMNS.filter((column) => columnIds.includes(column.id)).map((column) => (
          <Column
            key={column.id}
            columnId={column.id}
            title={column.title}
            previewIds={drag.preview?.[column.id]}
            onAdd={openCreate}
            onOpenTask={openEdit}
          />
        ))}
      </div>
      <DragOverlay>{activeTask && <TaskCardOverlay task={activeTask} />}</DragOverlay>
      {modal && <TaskModal target={modal} onClose={closeModal} />}
    </DndContext>
  );
}
