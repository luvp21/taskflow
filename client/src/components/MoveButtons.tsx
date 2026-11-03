import { useShallow } from 'zustand/react/shallow';
import { stepPlacement, type MoveDirection } from '../lib/boardMoves.ts';
import { useBoardStore } from '../store/boardStore.ts';

const BUTTONS: { direction: MoveDirection; symbol: string; label: string }[] = [
  { direction: 'left', symbol: '←', label: 'left' },
  { direction: 'up', symbol: '↑', label: 'up' },
  { direction: 'down', symbol: '↓', label: 'down' },
  { direction: 'right', symbol: '→', label: 'right' },
];

// A moved card is re-rendered in its new spot (a new DOM node if it changed column),
// so focus is put back on the same button, or on the card's grip if that button
// is now disabled at an edge. Keyboard users can keep pressing to move further.
function restoreFocus(taskId: string, direction: MoveDirection) {
  requestAnimationFrame(() => {
    const button = document.querySelector<HTMLButtonElement>(`[data-move="${taskId}:${direction}"]`);
    const target = button && !button.disabled ? button : document.querySelector<HTMLElement>(`[data-card-handle="${taskId}"]`);
    target?.focus();
  });
}

interface MoveButtonsProps {
  taskId: string;
  title: string;
}

// The non-drag way to move a card (keyboard, touch, precise moves). Uses the same
// store action as drag and drop. Hidden until the card is hovered or focused,
// always visible on touch screens.
export function MoveButtons({ taskId, title }: MoveButtonsProps) {
  // useShallow: re-render only when one of these four booleans flips.
  const canMove = useBoardStore(
    useShallow((state) =>
      BUTTONS.map(({ direction }) => stepPlacement(state.view.columns, taskId, direction) !== null),
    ),
  );

  function move(direction: MoveDirection) {
    const { view, moveTask } = useBoardStore.getState();
    const placement = stepPlacement(view.columns, taskId, direction);
    if (!placement) return;
    moveTask(taskId, placement);
    restoreFocus(taskId, direction);
  }

  return (
    <div className="relative z-10 ml-auto flex gap-1 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
      {BUTTONS.map(({ direction, symbol, label }, i) => (
        <button
          key={direction}
          type="button"
          data-move={`${taskId}:${direction}`}
          disabled={!canMove[i]}
          onClick={() => move(direction)}
          aria-label={`Move “${title}” ${label}`}
          className="rounded px-1.5 text-sm text-muted hover:bg-panel hover:text-fg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:invisible"
        >
          {symbol}
        </button>
      ))}
    </div>
  );
}
