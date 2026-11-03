import { findMatch } from '../lib/filters.ts';

interface HighlightProps {
  text: string;
  query: string;
}

// Wraps the first case-insensitive match of `query` in <mark>, which screen
// readers can announce as highlighted text. The original casing is kept.
export function Highlight({ text, query }: HighlightProps) {
  const match = findMatch(text, query);
  if (!match) return text;

  return (
    <>
      {text.slice(0, match.start)}
      <mark className="rounded-sm bg-highlight text-fg">{text.slice(match.start, match.end)}</mark>
      {text.slice(match.end)}
    </>
  );
}
