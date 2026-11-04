# Design decisions

## 1. State architecture and library choice

**Choice: Zustand**, with two stores: `boardStore` (tasks) and `uiStore` (toasts, filters,
chaos settings).

The board store holds three things:

- `confirmed`: tasks exactly as the server last returned them.
- `pending`: a list of changes (ops) the user made that the server hasn't confirmed yet.
- `view = applyOps(confirmed, pending)`: what the user sees, recomputed by a pure
  function whenever either of the other two changes.

This shape is the core of the optimistic UI. A change is shown by appending an op. When
the server confirms it, its result goes into `confirmed` and the op is removed. When it
fails, *only that op* is removed and `view` is recomputed, so only that change
disappears.

**Why Zustand fits this problem:**

- **Selectors.** Each card subscribes to its own task and each column to its own id list
  (`useShallow`). `applyOps` keeps unchanged tasks as the same object, so editing one
  card re-renders one card, and dragging doesn't re-render the board.
- **Usable outside React.** The sync engine is plain TypeScript. It reads and updates the
  store with `getState` / `setState`, so it keeps working when components unmount (for
  example, a modal closes while its save is still in flight).
- **Small.** One `create()` call, no providers, no action types. Everything in the
  store can be explained line by line.

**Compared with Redux Toolkit / RTK Query.** RTK Query's optimistic update pattern
patches the cache in `onQueryStarted` and calls `patchResult.undo()` on failure. `undo`
applies the inverse of that patch, which is a snapshot of the old values. With two moves
of the same card in flight, if the first fails after the second was applied, undoing the
first writes back the position from *before the first move*, erasing the second. My op
list avoids that: removing op 1 and recomputing still applies op 2.
(`applyOps.test.ts`: "two moves of one card in flight, the first fails".) RTK would also
add slices, actions and middleware that this app doesn't need.

**Compared with Context + useReducer.** A reducer could hold the same state, but every
component that reads a context re-renders on every change; there are no selectors. With
a card list that changes on every drag, that's a re-render cascade. Context state also
can't be read or changed by code outside React, which the sync engine needs.

**Limitations of my approach:**

- `view` is rebuilt from scratch on every change: O(n) to apply ops and O(n log n) to
  sort. Fine for hundreds of cards, not for tens of thousands (see question 4).
- Zustand enforces no structure. The rule that state only changes through `setBoard`
  (so `view` can never be stale) is a convention, not something the library guarantees.
- No built-in time-travel debugging (Redux DevTools needs Zustand's `devtools`
  middleware, which I didn't add).
- The sync engine is a module-level singleton. That's simple at runtime, but its queues
  aren't reset between tests, which caused a real test-isolation bug (question 3).
- The task types are copied in `client/src/types.ts` instead of shared with the server,
  so a schema change must be made in two places.

## 2. Race conditions and concurrency

**Scenario: a user drags 5 cards within 1 second on a slow (3G) network.**

*In the browser:*

1. **One op per drop.** While dragging, the preview lives in local component state; the
   store gets exactly one `move` op when the card is dropped. The op is appended to
   `pending`, so the card is in its new place in the same frame.
2. **The op carries neighbors, not just a number.** It stores the target column plus
   `beforeId` / `afterId` (the cards directly above and below), and a display-only
   `orderIndex` (the midpoint of the neighbors, the same formula the server uses).
3. **Per-card queues.** The sync engine has one queue per card. Five different cards
   means five queues, so five requests go out in parallel. Two requests for the *same*
   card are never in flight together, so they can't arrive out of order.
4. **Coalescing.** If the user drags the same card again while its first move is in
   flight, the new move waits. A third drag *replaces* the waiting move (a move is
   absolute, so only the latest one matters). Five rapid drags of one card send at most 2
   requests and end exactly where the user left it.
5. **Version read at send time.** Each request includes the card's `version`, read from
   `confirmed` when the request is actually sent, i.e. after the previous request for that
   card has returned its new version.

*On the server:*

6. **The server decides the position.** The client's neighbor ids are hints. The server
   looks up the card above as it is *now* and finds whatever is currently below it (or
   falls back to the card below, or the end of the column). A neighbor that was deleted
   or moved to another column is ignored. The new `orderIndex` is the midpoint between
   those two real neighbors.
7. **One atomic write.**
   `findOneAndUpdate({ _id, version }, { $set: { columnId, orderIndex }, $inc: { version: 1 } })`.
   Only this card's document changes. If someone else changed the card first, the version
   doesn't match, nothing is written, and the API answers **409 with the current card**.
8. **Ties.** Two people dropping different cards into the same gap at the same moment can
   get the same `orderIndex`. Every query and the client sort by `orderIndex` and then
   `_id`, so every client shows the same order.
9. **Rebalancing.** If two neighbors get closer than `1e-6` (around 30 drops into the
   same spot), halving again would lose floating-point precision. The server then
   renumbers the column (1000, 2000, ...) and places the card **inside one transaction**.
   It doesn't bump other cards' versions (a renumber isn't a user edit, so it must not
   cause 409s for other people). The response says `rebalanced: true` and the client
   refetches.

*Back in the browser:*

10. **Success:** the server's copy replaces the optimistic one in `confirmed`; the op is
    removed. Because both describe the same position, nothing moves on screen.
11. **Failure** (network error or 5xx): only that op is removed, the card returns to where
    it was, and a toast names it: "Couldn't move “Set up auth”. Reverted." The other four
    cards are unaffected. There are no automatic retries, so a rollback is never silently
    replayed later.
12. **409:** the server's current card (from the response body) goes into `confirmed`,
    the op is removed, and a toast says "This card changed elsewhere. Showing the latest
    version."

**Creates can't duplicate.** The client generates the card's UUID. A retried or
double-sent create hits MongoDB's unique `_id` index (error 11000), and the API returns
the existing card with 200 instead of creating a copy (tested with two identical creates
sent at the same moment). Separately, the form ignores a second submit in the same frame
(a double-click would otherwise create two cards with two *different* UUIDs).

**Measured** in a real browser with 3000 ms of added latency: 10 moves (5 different cards,
plus one card moved 5 times) sent **7 requests**, and the order on screen right after
the drags, after all responses, and after a reload was identical. A forced rebalance
renumbered the column to 1000 / 1500 / 2000 / 3000 with only the moved card's version
changed, and the client's order matched the server's.

**What I don't guarantee:** if a request succeeds on the server but the response is lost,
the client rolls back a change the server kept; a reload shows the truth. Real-time sync
(question 4) would close that gap.

## 3. AI debugging retrospective

Most of the code was written by Claude Code, working phase by phase from my plan, with
one pull request per phase. Every time its code turned out to be wrong and was fixed, the
mistake went into a log with the cause, the fix and the commit hash. Three real examples
(the commit hashes are in this repository's history):

**a) A test setup that only worked on machines that had already run it.**
The first server test setup started an in-memory MongoDB replica set in Vitest's
per-file setup (`setupFiles`), "so that test files are isolated". The first `npm test`
failed with `ENOENT: rename '...mongodb-...-7.0.14.tgz.downloading'`. The cause: Vitest
runs test files in parallel, so three workers each started downloading the same MongoDB
binary to the same temp file, and two crashed when the first renamed it. It would have
passed on any machine with the binary cached, so on a grader's clean machine it would have
looked like a random failure. The fix was to start **one** replica set in `globalSetup`
and give each test file its own database name, which keeps the isolation. The fix was
confirmed by deleting the binary cache and running the suite from cold (`a035d22`).

**b) An effect that wasn't safe to run twice (React StrictMode).**
The task modal's effect saved `document.activeElement` (the button that opened it),
opened the `<dialog>`, and refocused that button in its cleanup. A Playwright browser
test showed that after closing the modal, focus was on `<body>`, so a keyboard user
lost their place. In development, StrictMode runs effects as mount -> cleanup -> mount.
The cleanup didn't close the dialog, so on the second run the "opener" it saved was the
dialog's own input. The fix: record the opener only once (`openerRef.current ??= ...`)
and make the cleanup undo everything (`dialog.close()`, then refocus) (`bb57123`).
StrictMode exists to expose exactly this kind of effect: one whose setup can't safely run
a second time.

**c) A contrast test that read nothing.**
To enforce WCAG contrast, the AI wrote a test that loaded `index.css` with Vite's
`?raw` import, to avoid needing Node types in the browser config. Before trusting the
test, one dark color was made deliberately too dark to see it fail: *every* pair in both
themes failed, not just the three that use that color. Vitest turns CSS imports
(including `?raw`) into an empty string, so the test had parsed zero tokens. Written
slightly differently ("no pair is below 4.5" over an empty list), it would have passed
forever while checking nothing. The fix: read the file with `node:fs`, type-check that
test with Node types through its own tsconfig, and throw if a theme block yields no
tokens. The same mutation then failed exactly the three affected pairs (`00be6e3`).

Two more from the log: an optimistic delete that unmounted the modal that should have
shown its error (`bb57123`), and a test that left a never-resolving request in the sync
engine's queue and broke the next test (`ee2e4f9`).

**What I took from it:** the AI's mistakes were rarely syntax. They were wrong
assumptions about *runtime environments* (parallel workers, StrictMode, how Vitest
handles CSS, singletons across tests). Each was caught by running the real thing: a cold
test run, a real browser, a deliberately broken input. I now treat "the test passes" as
proving nothing until I've seen the test fail for the right reason.

## 4. Scaling to 50,000 tasks and 100 concurrent editors

**What breaks first: client-side work per change, starting with the move buttons.**

Every card renders `MoveButtons`, whose selector decides which arrows are enabled. With
filters it does so by computing the *visible columns of the whole board*, which is O(n).
Zustand runs every subscribed selector on every store change, so one drag, one
keystroke in a modal or one server response costs O(n) per card × n cards = **O(n²)**:
about 2.5 billion steps at 50k cards, on every change. Close behind it:

- **Rendering everything.** 50k cards are all in the DOM (each with drag handles and four
  buttons), and dnd-kit measures every sortable item when a drag starts.
- **Rebuilding `view`.** `applyOps` copies the whole task record and re-sorts every column
  on every change: O(n log n) per change, even when one card moved.
- **`GET /api/tasks` returns everything**, about 20 MB of JSON at 50k tasks. The sort
  includes `_id` after `columnId, orderIndex`, which the current index
  `{ columnId: 1, orderIndex: 1 }` can't fully serve, so MongoDB sorts in memory
  (`explain()` shows `SORT` over `COLLSCAN`; without `_id` in the sort it's an `IXSCAN`).

**What breaks next, with 100 editors: stale data.** There's no real-time channel, so
each person's board is only as fresh as their last load. Edits to cards someone else
changed turn into 409s (handled, but frustrating), and the board drifts from reality
until a reload. Rebalances of a busy column would conflict and retry inside MongoDB
transactions.

**How I would re-architect it:**

1. **Make each change cost O(changed cards), not O(n).**
   - Compute move-button availability from a card's index, passed as props, or only when
     the card is hovered or focused, instead of in a per-card store selector.
   - Keep the derived per-column id lists in the store and update only the affected
     column(s) when an op is added or settled, instead of rebuilding all of `view`.
   - Filter on the server for large boards, or keep a precomputed index for search.
2. **Load and render only what's visible.** Paginate per column
   (`GET /columns/:id/tasks?after=<orderIndex>&limit=50`) and virtualize each column's
   list, so the DOM holds dozens of cards, not 50,000. Add an index on
   `{ boardId, columnId, orderIndex, _id }` so every page is an index scan.
3. **Real-time updates.** A WebSocket or Server-Sent Events channel per board, fed by
   MongoDB change streams. With several API instances, rooms are coordinated through
   Redis pub/sub. Clients apply incoming changes to `confirmed`; pending ops still replay
   on top, so the optimistic model is unchanged. Conflicts become rare because everyone
   sees changes within milliseconds.
4. **Remove rebalancing.** Replace numeric `orderIndex` with string fractional keys
   (LexoRank-style): there's always room for a key between two others, so renumbering
   transactions disappear.
5. **Protect the API.** Authentication, per-user rate limits, and request size limits.

The parts that would *not* change: one document per task, version-checked atomic
writes, server-side placement from neighbors, idempotent creates, and the
`confirmed` + `pending` model on the client. They already behave correctly under
concurrency; what doesn't scale is how much work the client does per change and how
much data it loads.
