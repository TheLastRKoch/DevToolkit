# Design

## Context

- The app is a dependency-light Express server (`server.js`) that serves static
  pages from `public/` and exposes a template API backed by a process-memory
  `Map` plus a `nextSessionId` counter. There is no build step: `package.json`
  has a single dependency (`express`) and runs tests with `node --test`.
- Pages involved: `/template` (redirects to `/template/1`, driven by
  `template.js`), `/editor` (`editor.html`, loads Quill and `template.js`, which
  returns immediately because the path is not `/template/<id>`), and
  `/markdown-editor` (driven by `markdown-editor.js`).
- Header markup is duplicated three times in three different shapes: `/template`
  has a breadcrumb plus a title input and three buttons, `/editor` has a
  breadcrumb plus an Options dropdown, and `/markdown-editor` has only a
  breadcrumb.
- `/editor` loads Bootstrap's JS bundle, so its dropdown opens, but `template.js`
  returns immediately on that route, leaving its "Clear variables" and "Clear
  all" items inert. `/template` has no dropdown at all and does not load
  Bootstrap's JS bundle.
- Existing tests are HTTP-level (`test/routes.test.js`, `test/template.test.js`)
  plus static/mock-DOM assertions in `test/markdown-editor.test.js`; jsdom is not
  available.

## Goals / Non-Goals

**Goals:**

- One header item shared by all three pages, configured per page (breadcrumb,
  options, page name) with no duplicated header markup left behind.
- A page-name textbox on every session page with the same behavior `/template`
  has today.
- Browser-owned session state for all three pages, with a 30-day expiry, that
  does not depend on server memory.
- Keep `/api/template/*` working and its tests passing, and keep old URLs
  (`/editor`) working through a redirect.

**Non-Goals:**

- Removing, deprecating, or rewriting the server-side session API and its `Map`.
- Server-side persistence, accounts, or sharing sessions between users.
- Changing template variable syntax/semantics, the Template/Variables tab
  behavior, or the markdown editor's pane/scroll behavior.
- Adding a framework, bundler, or template engine.

## Decisions

### D1 — The shared header is a classic script with a mount point

Each page declares `<div id="pageHeader"></div>` after the navbar and loads
`public/static/scripts/page-header.js`, then calls
`DevToolkitPageHeader.init({ breadcrumb, options, pageName, onPageNameChange })`.
The script builds the breadcrumb, the Options dropdown, and the name textbox, and
keeps the row layout itself so all pages render an identical row. It uses the
same guarded pattern as the session store: a browser global plus a CommonJS
export, which keeps it usable from a classic `<script>` tag and testable from
Node.

Alternatives considered: ES modules — the app has no build step, and the repo's
tests exercise page scripts by evaluating them in a `new Function` sandbox with
mock `document`/`window` (`test/markdown-editor.test.js`), which module syntax
breaks; making pages modules would also require `package.json` to leave CommonJS
for Node to import the file directly. A custom element
(`<devtoolkit-page-header>`) — cleaner markup but awkward for passing per-page
action callbacks without extra glue. A server-side partial — would require a
template engine or HTML rewriting in Express, which serves static files today.
Shared CSS over duplicated markup — does not satisfy "pages import it and define
the options".

### D1b — The header owns the dropdown open/close behavior

`page-header.js` toggles the dropdown itself instead of relying on Bootstrap's
JS bundle, because `/template` does not load that bundle and the dropdown must
open on every page. This keeps one behavior everywhere, removes a CDN dependency
from the header's correctness, and lets the header's toggle be tested without
Bootstrap. Alternative: rely on `bootstrap.bundle.min.js` with `data-bs-toggle` —
the behavior would depend on a script only some pages load, and each page would
still need its own wiring.

### D3 — Options are data owned by each page

Pages pass an ordered array of `{ id, label, onSelect }`. The header renders
exactly that list and invokes the page's callback on selection. Page option sets:
template → New session, Clear variables, Clear all; text editor → New session,
Clear editor; markdown editor → New session, Clear editor. The text editor drops
its previous "Clear variables" item because the page has no variables and the
item was inert.

### D4 — Session store as a testable plain module over `localStorage`

`public/static/scripts/browser-session.js` exposes a store factory
(`openStore(pageType, storage)`) with `get`, `ensure`, `allocateId`, `save`, and
`remove`-on-expiry. It reads/writes one JSON document per page type at
`devtoolkit:sessions:<pageType>` shaped `{ version, nextId, sessions }`, where
each session record is `{ name, updatedAt, expiresAt, data }` and
`expiresAt = updatedAt + 30 days`. Expired records are dropped on read and on
write. `data` is page-specific: template → `{ text, variables }`, text editor →
`{ html }`, markdown editor → `{ markdown }`. The module also exports through a
guarded CommonJS branch so `node:test` can exercise it with a fake storage
object, which is how the current tests avoid jsdom.

The user's "localStorage with a due date of 30 days" is interpreted as a 30-day
expiry measured from each session's last modification, refreshed on every write.

Alternatives considered: one storage key per session (no atomicity gain at this
scale, more keys to scan); IndexedDB (async API, unnecessary); `sessionStorage`
(per-tab, breaks "New session opens in a new tab" and cross-tab continuity).

### D5 — Session identifiers are allocated in the browser

`nextId` lives in the page's stored document, so New session takes the next free
identifier without any server call. Server routes only validate
`^[1-9][0-9]*$` and serve the page shell, so any browser-allocated identifier
works. Alternative: keep `POST /api/template/sessions` as the allocator — it
exists only for the template page, would leave unused server sessions behind,
and contradicts browser ownership of session state.

### D6 — One canonical session URL per page

`/text-editor/:sessionId` and `/markdown-editor/:sessionId` are added, and the
bare `/text-editor` and `/markdown-editor` routes redirect to their `/1` session
page, mirroring the existing `/template` → `/template/1` behavior. `/editor`
responds with a permanent redirect to `/text-editor`, which then redirects to
`/text-editor/1`. `/template/:sessionId` and all `/api/template/*` endpoints keep
their current contract. Alternative: identify the session in a query string or
hash to avoid new routes — rejected for consistency with the existing
`/template/<id>` pattern.

### D7 — "Dirty" means "not yet persisted"

Pages set a dirty flag on input and clear it once the write to browser storage
succeeds, so the existing `beforeunload` protection still fires while a write is
pending or after a write has failed, and stops firing once everything is stored.

### D8 — The server session API stays, dormant in the UI

Pages stop calling `/api/template/*`; the `sessions` `Map`, `nextSessionId`, and
every endpoint remain unchanged and covered by existing tests, as requested.
This keeps a compatibility surface for non-UI clients at the cost of two state
models existing side by side; the design keeps the API untouched rather than
deleting or re-pointing it.

### D9 — Storage failures degrade to in-view state

When `localStorage` is missing or a write throws (private mode, quota), the store
keeps the session in memory for the current page view and the page surfaces a
message that changes will not be persisted, instead of failing to load.

### D10 — Tests follow the existing node:test style

`test/browser-sessions.test.js` unit-tests the store with a fake storage
(isolation per page, allocation, 30-day expiry, refresh on write, write
failure); `test/routes.test.js` gains cases for `/text-editor`, `/text-editor/1`,
the `/editor` redirect, `/markdown-editor/1`, and invalid identifiers;
`test/shared-page-header.test.js` asserts the header module renders the declared
options and name using the mock-DOM pattern already used for the markdown
editor. Existing `/api/template/*` tests stay as they are.

## Risks / Trade-offs

- Two session models (server `Map` and browser storage) coexist → pages never
  call the API, the API stays covered by its tests, and the follow-up removal is
  recorded as an open question rather than done here.
- `localStorage` can be unavailable, full, or cleared by the user → D9 fallback
  plus an explicit expiry rule; stored work is not durable beyond 30 days by
  design.
- Quill restores stored HTML, which is attacker-controlled only if the user
  pastes hostile content into their own browser → treat stored content as
  untrusted when importing it into the editor and keep the existing Quill
  configuration rather than evaluating markup.
- Two tabs on the same session can overwrite each other (no transaction support)
  → accepted; last write wins, and the conflict is bounded to one user's
  browser.
- Pages that rely on Bootstrap's dropdown markup could regress when the header
  owns the toggle → replace the duplicated markup entirely and assert the header
  structure in tests.

## Migration Plan

1. Add `browser-session.js` and `page-header.js` with their unit tests.
2. Rename `public/editor.html` to `public/text-editor.html`, add the text editor's
   page script, and update `server.js` routes, the home page link, and the
   breadcrumb label.
3. Adopt the shared header on all three pages: replace duplicated header markup,
   move template actions into the dropdown, and add the name textbox to the text
   editor and markdown editor.
4. Point each page's name/content at the browser store, leaving
   `/api/template/*` untouched, then update `docs/template.md`.

Rollback: each step is an independent commit, and because the server API is
untouched, reverting only steps 3–4 restores the previous server-backed behavior
without a data migration.

## Open Questions

- Whether the now-dormant `/api/template/*` endpoints should eventually be
  removed once nothing calls them.
- Whether tabs showing the same session should sync live via the `storage` event.
- Which additional pages should adopt the shared header next.
