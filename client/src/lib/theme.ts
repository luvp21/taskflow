// Keep in sync with the inline script in index.html (same key, same class).
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

// The inline script has already set the class before React starts, so the DOM is
// the source of truth for the initial theme.
export function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  // Makes native parts (scrollbars, form controls) match the theme too.
  root.style.colorScheme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked: the theme still applies for this visit, it just isn't saved.
  }
}
