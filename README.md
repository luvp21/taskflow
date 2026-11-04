# TaskFlow

A Kanban board that stays correct under slow networks, failed requests and fast,
repeated drags. Built with MongoDB, Express, React and Node, in TypeScript.

- **Optimistic UI:** every change shows instantly; if the server rejects it, only that
  change is undone, with a toast that names the card.
- **Concurrency-safe:** per-card request queues, merged rapid moves, version-checked
  atomic writes, and idempotent creates. No lost updates, no duplicate cards.
- **Light and dark themes:** no flash on reload, WCAG AA contrast enforced by a test.
- **Search and filters** (debounced search, priority and column chips) that keep drag
  and drop working.
- **Chaos Panel** to add latency and failures from the browser and watch rollback happen.

Design decisions and trade-offs: [DECISIONS.md](DECISIONS.md).

**Live demo:** https://taskflow-xi-green.vercel.app (API: https://taskflow-api.140-245-11-73.sslip.io/api/health)

| Light | Dark, filtered (search "set" + High) |
|---|---|
| ![Board in the light theme](docs/screenshots/board-light.png) | ![Board in the dark theme with a search and a priority filter](docs/screenshots/board-dark-filtered.png) |

## Quick start

Requirements: Node 20.19+ (or 22.12+), npm, Docker.

```bash
git clone https://github.com/luvp21/taskflow.git
cd taskflow
docker compose up -d --wait   # MongoDB as a single-node replica set
npm install
npm run seed                  # resets the database to 15 sample cards
npm run dev                   # API on :4000, app on http://localhost:5173
```

No `.env` files are needed locally: the defaults match `docker-compose.yml`. To change
anything, copy `server/.env.example` to `server/.env` and `client/.env.example` to
`client/.env`.

## Try the resilience features

Open **Chaos** in the header:

1. **Failure rate 100%**, then drag a card to another column. It moves at once (with a
   small sync dot), then snaps back with "Couldn't move “…”. Reverted."
2. **Latency 3000 ms, failure 0%**, then drag several cards quickly. Every move is
   instant; the dots clear as the server confirms. Press a card's ← → ← → quickly: only
   2 requests are sent for that card (DevTools -> Network). Reload: same order.
3. **Failure 30%**: drag several cards. Roughly a third come back, each with its own
   toast; the others stay.

The Chaos settings only affect writes made from your browser (they're sent as request
headers) and are saved in `localStorage`.

## Environment variables

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `MONGODB_URI` | server | `mongodb://localhost:27017/taskflow?replicaSet=rs0&directConnection=true` | MongoDB connection. Must be a replica set (transactions are used for column rebalancing). |
| `PORT` | server | `4000` | API port. |
| `CORS_ORIGIN` | server | `http://localhost:5173` | The one origin allowed to call the API. |
| `CHAOS_ENABLED` | server | on outside production, off in production | Lets `x-chaos-latency` / `x-chaos-fail-rate` request headers slow down or fail writes. |
| `VITE_API_URL` | client | `http://localhost:4000` | API base URL. Built into the bundle; public, never a secret. |

## Scripts (run from the repo root)

| Command | What it does |
|---|---|
| `npm run dev` | API (`tsx watch`) and client (Vite) together |
| `npm run seed` | Delete all tasks and insert 15 sample cards across every column, priority and tag |
| `npm test` | Server tests (Vitest + supertest + in-memory MongoDB replica set) and client tests |
| `npm run lint` | ESLint over both workspaces |
| `npm run typecheck` | `tsc` for both workspaces |
| `npm run build` | Server to `server/dist`, client to `client/dist` |

## API

All bodies are JSON and validated with Zod. Errors are `{ "error": "message" }` (plus
`fields` for validation errors, `task` for conflicts).

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/api/health` | | 200 `{ ok: true }` | |
| GET | `/api/tasks` | | 200 all tasks, sorted by column, `orderIndex`, `_id` | |
| POST | `/api/tasks` | `_id` (client UUID), `title`, `columnId`, optional `description`, `priority`, `tags`, `orderIndex` | **201** created, or **200** with the existing task if that `_id` already exists | 400 |
| PATCH | `/api/tasks/:id` | any of `title`, `description`, `priority`, `tags`, plus `version` | 200 updated task (`version` + 1) | 400, 404, **409** + current `task` |
| PATCH | `/api/tasks/:id/move` | `columnId`, `beforeId`, `afterId` (neighbor ids or `null`), `version` | 200 `{ task, rebalanced }` | 400, 404, **409** + current `task` |
| DELETE | `/api/tasks/:id` | | 204 | 404 |

The server computes a moved card's position from its neighbors **as they are on the
server**, and every update matches on `{ _id, version }` in a single atomic operation.

## How it works (short version)

- **One document per task** with a fractional `orderIndex` (cards 1000 apart; a drop
  lands at the midpoint of its neighbors), so a move writes exactly one document. When
  two neighbors get closer than `1e-6`, the column is renumbered inside a transaction.
- **Client state** = `confirmed` (what the server last said) + `pending` (changes not
  confirmed yet). The board shows `applyOps(confirmed, pending)`, a pure function. A
  failed change is removed from `pending`, so only it is undone; nothing is restored from
  a snapshot.
- **Sync engine** (plain TypeScript): one queue per card, so requests for a card never
  overlap, while different cards are sent in parallel. A newer move replaces a move that's
  still waiting. Versions are read when the request is sent.
- **Optimistic concurrency on the server:** `findOneAndUpdate({ _id, version }, ...)`;
  0 matches means 404 or 409 (with the current task, so the client can show it).

The full reasoning, including what happens with 5 drags in 1 second on a slow network, is
in [DECISIONS.md](DECISIONS.md).

## Project structure

```
client/                      React 19 + Vite + Tailwind CSS v4 + Zustand + dnd-kit
  index.html                 includes the blocking theme script
  src/
    api/                     http.ts (fetch wrapper, ApiError, chaos headers), tasks.ts
    store/                   boardStore.ts (confirmed, pending, view), applyOps.ts, uiStore.ts
    sync/                    syncEngine.ts (per-card queue, coalescing), sendOp.ts
    lib/                     ordering, board moves, filters, theme, chaos, contrast, ...
    hooks/                   useBoardDrag, useFilteredView, useDebouncedValue, useTheme
    components/              Board, Column, TaskCard, TaskModal, FilterBar, Toaster, ...
    types.ts                 shared types, mirrored from the server model
server/                      Express 5 + Mongoose + Zod
  src/
    app.ts  index.ts  config.ts  db.ts
    models/Task.ts           schema + { columnId, orderIndex } index
    schemas/                 Zod request schemas
    routes/ controllers/     HTTP layer
    services/                tasks.service.ts, ordering.service.ts (neighbors, rebalance)
    middleware/              validate, chaos, errorHandler
    scripts/seed.ts
  tests/                     API tests against an in-memory MongoDB replica set
docker-compose.yml           local MongoDB replica set
```

## Testing

- **Server (35 tests):** every endpoint and status code, idempotent and concurrent
  creates, stale-version 409s, neighbor-based moves (including a stale client view),
  rebalance and its rollback on conflict, chaos middleware. They run against a real
  in-memory MongoDB replica set, so transactions and duplicate-key errors behave as in
  production.
- **Client (98 tests):** `applyOps` rollback cases, the sync engine (serial per card,
  parallel across cards, coalescing), the store with a mocked API (409, 404, rebalance
  refetch), placement and filter logic, form validation, chaos settings, and WCAG
  contrast of every color pair in both themes.

## Deployment

| Part | Host | Notes |
|---|---|---|
| Database | MongoDB Atlas (M0) | Atlas clusters are replica sets, so transactions work. |
| API | Oracle Cloud VM (Ubuntu, always on) | systemd + nginx + Let's Encrypt; files and steps in [`deploy/`](deploy/README.md). |
| Client | Vercel | Root directory `client`, framework preset Vite. |

1. **Atlas:** create an M0 cluster and a database user, and allow network access from
   the VM. Add the database name to the connection string:
   `mongodb+srv://USER:PASS@HOST/taskflow?retryWrites=true&w=majority`.
2. **Seed it once from your machine:** `MONGODB_URI="<atlas uri>" npm run seed`.
3. **API on the VM:** follow [`deploy/README.md`](deploy/README.md): clone, write
   `/etc/taskflow-api.env` (`MONGODB_URI`, `CORS_ORIGIN` = the Vercel URL,
   `NODE_ENV=production`, `CHAOS_ENABLED=true`), run `deploy/setup.sh` once and
   `deploy/update.sh` for every deploy. The hostname uses [sslip.io](https://sslip.io), so
   HTTPS works without a DNS record. The browser needs HTTPS here, since the page itself
   is served over HTTPS.
4. **Vercel:** import the repository, root directory `client`, and set `VITE_API_URL` to
   the API URL (no trailing slash). `VITE_` variables are built into the bundle, so
   changing it needs a redeploy.

`CHAOS_ENABLED=true` keeps the Chaos Panel working in production. It only affects
requests that send the `x-chaos-*` headers, which only the panel does.

## Known limitations

- No authentication or rate limiting.
- No real-time updates: other people's changes appear on reload (or as a 409 when you
  edit a card someone else changed).
- On touch screens, cards are moved with the ← ↑ ↓ → buttons (always visible there)
  rather than dragged, so the board can still be scrolled.
- The whole board is loaded at once; see the scaling answer in DECISIONS.md.

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
| `fg` on `highlight` | Search match in a title | 13.06 | 7.34 |
| `accent` vs `card` (focus ring, non-text, needs 3:1) | Focus outlines | 5.90 | 6.69 |
