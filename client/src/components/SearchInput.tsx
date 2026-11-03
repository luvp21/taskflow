import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useDebouncedValue } from '../hooks/useDebouncedValue.ts';
import { useUiStore } from '../store/uiStore.ts';

export const SEARCH_DEBOUNCE_MS = 300;

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

// The text box updates instantly (local state); the store, and so the board, only
// gets the value 300 ms after typing stops. Esc clears at once, without waiting.
export function SearchInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const debouncedText = useDebouncedValue(text, SEARCH_DEBOUNCE_MS);
  const setQuery = useUiStore((state) => state.setQuery);

  // Publish the settled text. (Clear all resets this component by changing its
  // `key` in FilterBar, which remounts it with empty text.)
  useEffect(() => {
    setQuery(debouncedText);
  }, [debouncedText, setQuery]);

  // "/" focuses the search from anywhere, unless the user is typing somewhere else
  // or a modal is open.
  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== '/' || isTypingTarget(event.target)) return;
      if (document.querySelector('dialog[open]')) return;
      event.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Escape') return;
    setText('');
    setQuery('');
  }

  return (
    <div className="relative w-full sm:w-72">
      <label htmlFor="board-search" className="sr-only">
        Search cards
      </label>
      <input
        ref={inputRef}
        id="board-search"
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search cards…"
        autoComplete="off"
        className="w-full rounded-lg border border-border bg-card py-1.5 pr-9 pl-3 text-sm text-fg placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      <kbd
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-border px-1.5 text-xs text-muted"
      >
        /
      </kbd>
    </div>
  );
}
