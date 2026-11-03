# TaskFlow

A Kanban board built with the MERN stack (MongoDB, Express, React, Node) in TypeScript.

Focus areas: optimistic UI with per-operation rollback, safe concurrent edits
(version-guarded writes), light and dark themes, and search with filters.

> Work in progress. Setup instructions, screenshots, and live links will be added as the
> project is built.

## Theme and contrast

Light and dark themes share one set of color tokens (CSS variables in
`client/src/index.css`); components only use the tokens. The saved theme (or the
system setting, if nothing is saved) is applied by a blocking script in
`client/index.html` before the first paint, so reloading never flashes the wrong theme.

Every text/background pair meets WCAG AA (4.5:1 for normal text). The ratios below are
computed from the actual tokens with the WCAG relative-luminance formula, and
`client/src/theme.contrast.node.test.ts` fails the build if any pair drops below the
minimum.

| Text / background | Used for | Light | Dark |
|---|---|---|---|
| `fg` on `surface` | Page text | 14.91 | 15.42 |
| `fg` on `panel` | Column headings | 13.61 | 13.69 |
| `fg` on `card` | Card titles, modal, toasts | 16.27 | 11.95 |
| `muted` on `surface` | Secondary text | 6.89 | 8.43 |
| `muted` on `panel` | Tags, empty column text | 6.29 | 7.49 |
| `muted` on `card` | Card descriptions, counts | 7.51 | 6.53 |
| `accent-fg` on `accent` | Primary buttons, selected chips | 5.90 | 8.49 |
| `accent` on `surface` | Clear all link | 5.41 | 8.64 |
| `danger-fg` on `danger` | Delete button | 6.57 | 8.41 |
| `danger` on `card` | Form errors, Delete link | 6.57 | 6.49 |
| `danger` on `panel` | Delete link on hover | 5.50 | 7.44 |
| `danger` on `surface` | Active Chaos button | 6.03 | 8.37 |
| `priority-low-fg` on `priority-low-bg` | Low badge | 6.08 | 8.05 |
| `priority-medium-fg` on `priority-medium-bg` | Medium badge | 7.06 | 8.71 |
| `priority-high-fg` on `priority-high-bg` | High badge | 6.55 | 8.56 |
| `accent` vs `card` (focus ring, non-text, needs 3:1) | Focus outlines | 5.90 | 6.69 |
