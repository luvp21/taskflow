import { useEffect } from 'react';
import { useBoardStore } from '../store/boardStore.ts';
import { COLUMNS } from '../types.ts';
import { BoardError, BoardSkeleton } from './BoardStatus.tsx';
import { Column } from './Column.tsx';

export function Board() {
  const status = useBoardStore((state) => state.status);
  const loadError = useBoardStore((state) => state.loadError);
  const loadTasks = useBoardStore((state) => state.loadTasks);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  if (status === 'loading') return <BoardSkeleton />;
  if (status === 'error') {
    return <BoardError message={loadError ?? 'Unknown error'} onRetry={() => void loadTasks()} />;
  }

  // Phones: columns side by side with horizontal scroll and snap. md+: they share the width.
  return (
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 md:snap-none">
      {COLUMNS.map((column) => (
        <Column key={column.id} columnId={column.id} title={column.title} />
      ))}
    </div>
  );
}
