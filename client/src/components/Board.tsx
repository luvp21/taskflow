import { useCallback, useEffect, useState } from 'react';
import { useBoardStore } from '../store/boardStore.ts';
import { COLUMNS, type ColumnId } from '../types.ts';
import { BoardError, BoardSkeleton } from './BoardStatus.tsx';
import { Column } from './Column.tsx';
import { TaskModal, type ModalTarget } from './TaskModal.tsx';

export function Board() {
  const status = useBoardStore((state) => state.status);
  const loadError = useBoardStore((state) => state.loadError);
  const loadTasks = useBoardStore((state) => state.loadTasks);
  const [modal, setModal] = useState<ModalTarget | null>(null);

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

  // Phones: columns side by side with horizontal scroll and snap. md+: they share the width.
  return (
    <>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 md:snap-none">
        {COLUMNS.map((column) => (
          <Column
            key={column.id}
            columnId={column.id}
            title={column.title}
            onAdd={openCreate}
            onOpenTask={openEdit}
          />
        ))}
      </div>
      {modal && <TaskModal target={modal} onClose={closeModal} />}
    </>
  );
}
