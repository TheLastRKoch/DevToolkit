# Design

## Context

See `proposal.md` for motivation. The current store keeps exactly one document
per page kind at `devtoolkit:sessions:<kind>`, and every page route is ID-less.
The app has no build step: browser scripts are classic scripts guarded by a
global/CommonJS export, and tests exercise them with a mock DOM.

Constraints that shape the approach:

- Sessions must stay browser-local and title-gated; untitled work is not stored.
- Existing single-session data must not be lost.
- The server-side `/api/template/*` API must remain unchanged.
- Routes must keep the legacy `/editor` redirect working.

## Goals / Non-Goals

**Goals:**

- Multiple titled sessions per page kind, each with a per-kind numeric ID.
- `/<kind>` starts a fresh untitled session; `/<kind>/<id>` opens a saved one.
- The first valid title save assigns the ID and updates the URL without reload.
- Gallery cards link to `/<kind>/<id>` and delete only that session.
- Migrate the existing single-session document to ID `1`.

**Non-Goals:**

- Global ID uniqueness across page kinds; IDs are per kind.
- Reusing IDs after deletion.
- Server-side persistence, cross-tab synchronization, or user accounts.
- Changing versioning (three FIFO snapshots), title validation, or title
  immutability-after-focus-loss behavior.
- Removing or rewriting the kept `/api/template/*` endpoints.

## Decisions

### D1 — Per-session storage keys with a per-kind counter

Each titled session is stored at `devtoolkit:sessions:<kind>:<id>` and carries
`{ id, title, kind, versions }`. A monotonic counter lives separately at
`devtoolkit:session-counters:<kind>`.

Alternatives considered:

- One array document per kind — simpler lookups but every save rewrites all
  sessions, delete touches unrelated sessions, and concurrent tabs overwrite
  each other.
- Global counter across kinds — not needed because the kind is already part of
  the URL; per-kind IDs match `/template/1` and `/text-editor/1`.
- Deriving the next ID from the maximum existing ID — reuses the highest ID
  after deletion, which the requirements forbid.

`listAll` accepts only `devtoolkit:sessions:<kind>:<id>` keys with a numeric
suffix and ignores counter and legacy keys.

### D2 — ID allocation and collision handling

The next ID is read from the counter, defaulting to `1`. If the counter is
missing or corrupt, it is initialized from the highest existing numeric ID plus
one. Before writing, the store checks whether the target key already exists; on a
collision (possible with simultaneous tabs) it advances to the next free ID and
updates the counter. The counter is advanced before or with the session write so
deleted IDs are never reused.

### D3 — Store API

`openStore(kind, storage, { sessionId, now, onWriteError })`:

- With `sessionId`: load `devtoolkit:sessions:<kind>:<id>`; if absent, return an
  empty session bound to that ID.
- Without `sessionId`: start an untitled session with `id === null`.
- The first `save({ title })` that makes the session titled allocates an ID,
  switches the store's key to that session, writes it, and returns the ID.
- `listAll` returns `{ id, kind, title, latestDate }`.
- `sessionKey(kind, id)` builds the per-session key; `counterKey(kind)` builds
  the counter key.
- `remove()` removes the opened session; the gallery removes by kind and ID.

Existing methods (`get`, `getTitle`, `isTitled`, `save`, `snapshot`, `content`,
`status`, `isPersisted`) keep their behavior.

### D4 — Routes and page boot

`server.js` adds numeric-ID routes for all three page kinds:

- `GET /template/:id`, `/text-editor/:id`, `/markdown-editor/:id` serve the page.
- A non-numeric ID responds `404`.
- `GET /editor/:id` redirects `301` to `/text-editor/:id`; `/editor` keeps
  redirecting to `/text-editor`.

Each page script parses `window.location.pathname` for a numeric ID:

- No ID (`/<kind>`) opens a fresh untitled session.
- An ID (`/<kind>/<id>`) opens that session, creating an empty session when the
  ID is not stored.
- When the store allocates the first ID, the page calls
  `history.replaceState(null, '', '/<kind>/<id>')` so the address bar reflects
  the saved session without a reload.

Nested routes also require absolute asset URLs. `text-editor.html` and
`markdown-editor.html` currently reference `static/...`; at `/<kind>/<id>` those
resolve under the route and 404, so the page scripts never load. Both pages must
use `/static/...` for their scripts and favicon.

### D5 — Gallery behavior

The gallery reads `listAll` results, renders one card per session ID, links each
title to `/<kind>/<id>`, and removes only the selected `kind:id` key. The New
dropdown keeps its ID-less `/<kind>` links, which now guarantee a fresh session.

### D6 — Legacy migration

A shared `migrateLegacySession(kind, storage)` runs before opening a store and
before `listAll`:

1. Read `devtoolkit:sessions:<kind>`.
2. If it is a valid titled document and no numbered session has been created for
   it, write it to `devtoolkit:sessions:<kind>:1` (or the next free ID if `1`
   is occupied) and set the counter past it.
3. Remove the legacy key.
4. A corrupt or untitled legacy document is left untouched and ignored.

Migration is idempotent: after the legacy key is gone, later runs do nothing.

### D7 — Versioning and title behavior stay unchanged

Version snapshots, three-entry FIFO truncation, deduplication, title validation,
focus-loss locking, and dirty-state protection continue to operate per session
ID. Only the storage key and the URL/ID plumbing change.

## Risks / Trade-offs

- **Concurrent tabs can allocate the same ID** → collision check advances to the
  next free ID before writing; last writer wins only on the same ID.
- **Counter corruption** → fall back to `max(existing numeric ID) + 1`.
- **Migration removes the legacy key** → rollback requires copying
  `devtoolkit:sessions:<kind>:1` back to `devtoolkit:sessions:<kind>`; documented
  in the migration plan.
- **Unknown IDs silently open empty sessions** → accepted so a typed or stale
  URL remains usable; no data is fabricated or persisted until titled.
- **URL updates without reload** → `history.replaceState` is used, so no extra
  history entry is created and no page state is lost.

## Migration Plan

1. Add per-session keys, the counter, `migrateLegacySession`, and unit tests.
2. Add `sessionId` support, ID allocation, and `listAll` results with IDs.
3. Add numeric routes and the legacy `/editor/:id` redirect.
4. Parse route IDs in the three page scripts and update the URL after first save.
5. Update gallery links and delete-by-ID.
6. Migrate legacy keys on first gallery/page access.

Rollback: restore the previous code. Before rolling back, copy the migrated
document from `devtoolkit:sessions:<kind>:1` back to
`devtoolkit:sessions:<kind>` for each page kind that needs the old single-session
behavior restored.

## Open Questions

None.
