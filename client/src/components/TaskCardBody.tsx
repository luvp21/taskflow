import type { ReactNode } from 'react';
import type { Task } from '../types.ts';
import { PriorityBadge } from './PriorityBadge.tsx';

interface TaskCardBodyProps {
  task: Task;
  actions?: ReactNode; // shown at the end of the badge row
}

// The non-interactive part of a card, shared by the real card and the drag overlay.
export function TaskCardBody({ task, actions }: TaskCardBodyProps) {
  return (
    <>
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
        {actions}
      </div>
    </>
  );
}

export function TaskCardOverlay({ task }: { task: Task }) {
  return (
    <article className="rotate-2 cursor-grabbing rounded-lg border border-border bg-card p-3 shadow-lg">
      <h3 className="font-medium break-words">{task.title}</h3>
      <TaskCardBody task={task} />
    </article>
  );
}
