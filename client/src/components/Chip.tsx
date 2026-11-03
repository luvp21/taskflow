import clsx from 'clsx';
import type { ReactNode } from 'react';

interface ChipProps {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}

// An on/off toggle button. aria-pressed tells screen readers whether it is on.
export function Chip({ pressed, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={clsx(
        'rounded-full border px-3 py-1 text-xs font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none',
        pressed ? 'border-accent bg-accent text-accent-fg' : 'border-border hover:bg-panel',
      )}
    >
      {children}
    </button>
  );
}
