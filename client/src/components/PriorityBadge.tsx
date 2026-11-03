import clsx from 'clsx';
import { PRIORITY_LABELS, type Priority } from '../types.ts';

// Full class names written out so Tailwind's scanner can find them; a name built
// at runtime (`bg-priority-${p}-bg`) would never get generated.
const PRIORITY_STYLES: Record<Priority, string> = {
  low: 'bg-priority-low-bg text-priority-low-fg',
  medium: 'bg-priority-medium-bg text-priority-medium-fg',
  high: 'bg-priority-high-bg text-priority-high-fg',
};

interface PriorityBadgeProps {
  priority: Priority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span className={clsx('rounded px-1.5 py-0.5 text-xs font-medium', PRIORITY_STYLES[priority])}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
