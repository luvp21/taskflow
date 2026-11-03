import { useSortable } from '@dnd-kit/sortable';
import clsx from 'clsx';
import { memo, type CSSProperties } from 'react';
import { opTaskId } from '../lib/ops.ts';
import { useBoardStore } from '../store/boardStore.ts';
import { useUiStore } from '../store/uiStore.ts';
import { Highlight } from './Highlight.tsx';
import { MoveButtons } from './MoveButtons.tsx';
import { TaskCardBody } from './TaskCardBody.tsx';

interface TaskCardProps {
  taskId: string;
  onOpen: (taskId: string) => void;
}

function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 fill-current">
      <circle cx="5" cy="3" r="1.5" /><circle cx="11" cy="3" r="1.5" />
      <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
      <circle cx="5" cy="13" r="1.5" /><circle cx="11" cy="13" r="1.5" />
    </svg>
  );
}

// memo + a selector for this one task: the card re-renders only when its own task
// changes. Drag wiring: pointer listeners on the whole card (drag from anywhere;
// a click under 5px still opens it), keyboard drag only from the grip button.
export const TaskCard = memo(function TaskCard({ taskId, onOpen }: TaskCardProps) {
  const task = useBoardStore((state) => state.view.tasksById[taskId]);
  // A boolean selector: the card re-renders only when it starts or stops syncing.
  const isSyncing = useBoardStore((state) => state.pending.some((op) => opTaskId(op) === taskId));
  const query = useUiStore((state) => state.filters.query);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: taskId });
  if (!task) return null;

  const style: CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...listeners}
      className={clsx(
        'group relative rounded-lg border border-border bg-card p-3 shadow-sm hover:border-muted has-focus-visible:ring-2 has-focus-visible:ring-accent',
        isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-start gap-1">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          type="button"
          data-card-handle={taskId}
          aria-label={`Drag “${task.title}”`}
          className="relative z-10 -ml-1 cursor-grab rounded p-0.5 text-muted hover:text-fg focus:outline-none"
        >
          <GripIcon />
        </button>
        {/* Stretched over the card (after:inset-0): click anywhere opens it. */}
        <h3 className="min-w-0 flex-1 font-medium break-words">
          <button
            type="button"
            onClick={() => onOpen(taskId)}
            className="text-left after:absolute after:inset-0 after:rounded-lg focus:outline-none"
          >
            <Highlight text={task.title} query={query} />
          </button>
        </h3>
        {isSyncing && (
          <span className="mt-1.5 flex shrink-0 items-center" title="Saving…">
            <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-accent" />
            <span className="sr-only">Saving</span>
          </span>
        )}
      </div>
      <TaskCardBody task={task} actions={<MoveButtons taskId={taskId} title={task.title} />} />
    </article>
  );
});
