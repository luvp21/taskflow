import { useState } from 'react';
import { applyTheme, currentTheme, type Theme } from '../lib/theme.ts';

// Starts from what the inline script already applied, so React's first render
// agrees with the first paint (no flip after hydration).
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  }

  return { theme, toggleTheme };
}
