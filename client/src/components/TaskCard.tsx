import { memo } from 'react';
import { useBoardStore } from '../store/boardStore.ts';
import { PriorityBadge } from './PriorityBadge.tsx';

interface TaskCardProps {
  taskId: string;
  onOpen: (taskId: string) => void;
}

// memo + a selector for this one task: the card re-renders only when its own task
// object changes. applyOps keeps unchanged tasks as the same object, so editing one
// card doesn't re-render the others. (onOpen must be stable, see Board.)
export const TaskCard = memo(function TaskCard({ taskId, onOpen }: TaskCardProps) {
  const task = useBoardStore((state) => state.view.tasksById[taskId]);
  if (!task) return null;

  // The title button is stretched over the whole card (after:inset-0), so the card
  // is clickable but screen readers hear just the title as the button name.
  return (
    <article className="relative rounded-lg border border-border bg-card p-3 shadow-sm hover:border-muted has-focus-visible:ring-2 has-focus-visible:ring-accent">
      <h3 className="font-medium break-words">
        <button
          type="button"
          onClick={() => onOpen(taskId)}
          className="text-left after:absolute after:inset-0 after:rounded-lg focus:outline-none"
        >
          {task.title}
        </button>
      </h3>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-sm break-words text-muted">{task.description}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={task.priority} />
        {task.tags.map((tag) => (
          <span key={tag} className="rounded bg-panel px-1.5 py-0.5 text-xs text-muted">
            #{tag}
          </span>
        ))}
      </div>
    </article>
  );
});
