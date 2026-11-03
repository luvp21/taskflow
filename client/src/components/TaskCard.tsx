import { memo } from 'react';
import { useBoardStore } from '../store/boardStore.ts';
import { PriorityBadge } from './PriorityBadge.tsx';

interface TaskCardProps {
  taskId: string;
}

// memo + a selector for this one task: the card re-renders only when its own task
// object changes. applyOps keeps unchanged tasks as the same object, so editing one
// card doesn't re-render the others.
export const TaskCard = memo(function TaskCard({ taskId }: TaskCardProps) {
  const task = useBoardStore((state) => state.view.tasksById[taskId]);
  if (!task) return null;

  return (
    <article className="rounded-lg border border-border bg-card p-3 shadow-sm">
      <h3 className="font-medium break-words">{task.title}</h3>
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
