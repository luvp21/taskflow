import { COLUMNS } from '../types.ts';

const SKELETON_CARDS = [0, 1, 2];

export function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden" aria-busy="true" aria-label="Loading board">
      {COLUMNS.map((column) => (
        <div key={column.id} className="w-[85vw] shrink-0 rounded-xl bg-panel p-3 sm:w-80 md:flex-1">
          <div className="mb-3 h-4 w-24 animate-pulse rounded bg-border" />
          {SKELETON_CARDS.map((card) => (
            <div key={card} className="mb-2 h-20 animate-pulse rounded-lg bg-card" />
          ))}
        </div>
      ))}
    </div>
  );
}

interface BoardErrorProps {
  message: string;
  onRetry: () => void;
}

export function BoardError({ message, onRetry }: BoardErrorProps) {
  return (
    <div role="alert" className="mx-auto max-w-md rounded-xl border border-border bg-card p-6 text-center">
      <p className="font-semibold">Couldn't load the board</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
