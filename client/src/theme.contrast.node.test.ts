import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from './lib/contrast.ts';

// Reads the real tokens from index.css, so changing a color can't silently break
// contrast: this test fails first. Read from disk with Node, because Vitest turns
// CSS imports (even `?raw`) into empty strings; that's why this file is a
// *.node.test.ts, type-checked with Node types by tsconfig.node.json.
const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');

function tokensIn(selector: string): Record<string, string> {
  const block = css.match(new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
  const tokens = Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map(([, name, hex]) => [name, hex]),
  );
  if (Object.keys(tokens).length === 0) throw new Error(`No color tokens found for ${selector}`);
  return tokens;
}

// [text token, background token, where it's used]
const TEXT_PAIRS: [string, string, string][] = [
  ['fg', 'surface', 'page text'],
  ['fg', 'panel', 'column headings'],
  ['fg', 'card', 'card titles, modal, toasts'],
  ['muted', 'surface', 'secondary text on the page'],
  ['muted', 'panel', 'tags, empty column text'],
  ['muted', 'card', 'card descriptions, counts, hints'],
  ['accent-fg', 'accent', 'primary buttons, selected chips'],
  ['danger-fg', 'danger', 'delete button'],
  ['danger', 'card', 'form errors, Delete link'],
  ['danger', 'panel', 'Delete link on hover'],
  ['danger', 'surface', 'active Chaos button'],
  ['priority-low-fg', 'priority-low-bg', 'Low badge'],
  ['priority-medium-fg', 'priority-medium-bg', 'Medium badge'],
  ['priority-high-fg', 'priority-high-bg', 'High badge'],
];

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3; // focus rings and other UI parts

describe.each([
  ['light', ':root'],
  ['dark', '.dark'],
])('%s theme contrast', (_theme, selector) => {
  const tokens = tokensIn(selector);

  it.each(TEXT_PAIRS)('%s on %s (%s) meets AA 4.5:1', (text, background) => {
    expect(contrastRatio(tokens[text], tokens[background])).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('the accent focus ring stands out from cards (3:1)', () => {
    expect(contrastRatio(tokens.accent, tokens.card)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });
});

describe('contrastRatio', () => {
  it('matches the known extremes', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
  });
});
