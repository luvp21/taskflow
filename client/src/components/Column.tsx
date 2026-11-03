import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import clsx from 'clsx';
import { useShallow } from 'zustand/react/shallow';
import { useBoardStore } from '../store/boardStore.ts';
import type { ColumnId } from '../types.ts';
import { TaskCard } from './TaskCard.tsx';

interface ColumnProps {
  columnId: ColumnId;
  title: string;
  previewIds: string[] | undefined; // set only while a card is being dragged
  onAdd: (columnId: ColumnId) => void;
  onOpenTask: (taskId: string) => void;
}

export function Column({ columnId, title, previewIds, onAdd, onOpenTask }: ColumnProps) {
  // applyOps builds new id arrays on every change; useShallow compares the ids
  // inside, so this column re-renders only when ITS list actually changed.
  const storeIds = useBoardStore(useShallow((state) => state.view.columns[columnId]));
  const taskIds = previewIds ?? storeIds;
  // The column itself is a drop target, so empty columns accept cards too.
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  const headingId = `column-${columnId}`;

  return (
    <section
      aria-labelledby={headingId}
      className="flex w-[85vw] shrink-0 snap-start flex-col rounded-xl bg-panel p-3 sm:w-80 md:w-auto md:flex-1 md:shrink"
    >
      <header className="mb-3 flex items-center gap-2">
        <h2 id={headingId} className="text-sm font-semibold">
          {title}
        </h2>
        <span className="rounded-full bg-card px-2 text-xs text-muted">
          {taskIds.length}
          <span className="sr-only"> cards</span>
        </span>
        <button
          type="button"
          onClick={() => onAdd(columnId)}
          className="ml-auto rounded-md px-2 py-1 text-sm font-medium text-muted hover:bg-card hover:text-fg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          + Add<span className="sr-only"> card to {title}</span>
        </button>
      </header>

      <SortableContext id={columnId} items={taskIds} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          className={clsx('flex min-h-24 flex-1 flex-col gap-2 rounded-lg', isOver && taskIds.length === 0 && 'bg-card/60')}
        >
          {taskIds.length === 0 && (
            <li className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted">
              No cards yet
            </li>
          )}
          {taskIds.map((id) => (
            <li key={id}>
              <TaskCard taskId={id} onOpen={onOpenTask} />
            </li>
          ))}
        </ul>
      </SortableContext>
    </section>
  );
}
