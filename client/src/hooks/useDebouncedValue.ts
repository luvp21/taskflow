import { useEffect, useState } from 'react';

// Returns `value` once it has stopped changing for `delayMs`. Each change starts a
// new timer and the cleanup cancels the previous one, so only the last value of a
// burst (e.g. fast typing) gets through.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
