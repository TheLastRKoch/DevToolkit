# Design

## Context

- The app is a dependency-light Express server (`server.js`) that serves static
  pages from `public/` and exposes a template API backed by a process-memory
  `Map` plus a `nextSessionId` counter. There is no build step: `package.json`
  has a single dependency (`express`) and runs tests with `node --test`.
- Pages involved: `/template` (driven by `template.js`), `/text-editor`
  (`text-editor.html`, loads Quill and `text-editor.js`), and
  `/markdown-editor` (driven by `markdown-editor.js`).
- Header markup is duplicated three times in three different shapes: `/template`
  has a breadcrumb plus a title input and three buttons, `/text-editor` has a
  breadcrumb plus an Options dropdown, and `/markdown-editor` has only a
  breadcrumb. This change keeps the options and title but drops the breadcrumb
  from every page.
- `/text-editor` loads Bootstrap's JS bundle, so its dropdown opens, but
  `template.js` returns immediately on that route, leaving its "Clear variables"
  and "Clear all" items inert. `/template` has no dropdown at all and does not
  load Bootstrap's JS bundle.
- Existing tests are HTTP-level (`test/routes.test.js`, `test/template.test.js`)
  plus static/mock-DOM assertions in `test/markdown-editor.test.js`; jsdom is not
  available.

## Goals / Non-Goals

**Goals:**

- One header item shared by all three pages, configured per page (options,
  title) with no duplicated header markup or breadcrumb left behind.
- A title textbox on every session page with placeholder "DevToolKit", validation
  (reject default/empty), and immutability (disabled after the textbox loses
  focus with a valid title).
- Conditional browser-owned session persistence: save to `localStorage` only
  when the user provides a valid custom title. One session per page type.
- Version history: keep the last 3 content snapshots per titled session using
  FIFO, captured on visibility change / page unload, with deduplication.
- Home page gallery showing all saved sessions with kind filters, title links
  that reopen each session's page, and delete.
- Keep `/api/template/*` working and its tests passing, and keep old URLs
  (`/editor`) working through a redirect.

**Non-Goals:**

- Removing, deprecating, or rewriting the server-side session API and its `Map`.
- Server-side persistence, accounts, or sharing sessions between users.
- Multi-session per page or session-ID-based routing.
- Changing template variable syntax/semantics, the Template/Variables tab
  behavior, or the markdown editor's pane/scroll behavior.
- Adding a framework, bundler, or template engine.
- Session expiry — titled sessions persist until explicitly deleted.

## Decisions

### D1 — The shared header is a classic script with a mount point

Each page declares `<div id="pageHeader"></div>` after the navbar and loads
`public/static/scripts/page-header.js`, then calls
`DevToolkitPageHeader.init({ options, title, onTitleChange })`.
The script builds the Options dropdown and the title textbox, and keeps the row
layout itself so all pages render an identical row without a breadcrumb. It
uses the same guarded pattern as the session store: a browser global plus a
CommonJS export, which keeps it usable from a classic `<script>` tag and testable
from Node.

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

### D1c — Desktop header alignment

On desktop viewports (`md` and wider) the header row uses three equal columns:
an empty leading column, the Options dropdown centered in the middle column, and
the title textbox right-aligned in the trailing column. Below `md`, the leading
column is hidden and the title textbox and dropdown collapse into the existing
end-aligned group, with the title first and the dropdown after it. This centers
the dropdown without duplicating the controls or changing smaller-screen
behavior.

### D3 — Options are data owned by each page

Pages pass an ordered array of `{ id, label, onSelect }`. The header renders
exactly that list and invokes the page's callback on selection. Page option sets:
template → Clear variables, Clear all; text editor → Clear editor; markdown
editor → Clear editor. "New session" is removed from all pages because the model
is single-session-per-page.

### D4 — Session store as a testable plain module over `localStorage`

`public/static/scripts/browser-session.js` exposes a store factory
(`openStore(kind, storage)`) with `get`, `save`, `remove`, and `listAll`. It
reads/writes one JSON document per page type at `devtoolkit:sessions:<kind>`
shaped:

```json
{
  "title": "My Custom Title",
  "kind": "text-editor",
  "versions": [
    {
      "updatedDate": "2026-10-16T11:40:00Z",
      "content": "Updated content string..."
    }
  ]
}
```

For the template page, each version also carries a `variables` field:

```json
{
  "title": "Release Notes Template",
  "kind": "template",
  "versions": [
    {
      "updatedDate": "2026-10-16T12:00:00Z",
      "content": "Hello @[name], release @[version] is live.",
      "variables": "@[name]=World\n@[version]=1.0.0"
    }
  ]
}
```

**Conditional persistence**: the store writes to `localStorage` only when a
valid title is provided (non-empty, non-whitespace, not matching "DevToolKit"
case-insensitively). Sessions without a valid title exist only in-view state.

**FIFO versioning**: the `versions` array keeps the last 3 snapshots. A new
version is pushed when the user navigates away (visibility change / page
unload) and the current content differs from the most recent version (excluding
`updatedDate`). When a 4th version would be added, the oldest is dropped.

The module also exports through a guarded CommonJS branch so `node:test` can
exercise it with a fake storage object, which is how the current tests avoid
jsdom.

Alternatives considered: one storage key per session (unnecessary — single
session per page); IndexedDB (async API, unnecessary); `sessionStorage`
(per-tab, loses state on tab close).

### D6 — Pages serve at their base URL

`/text-editor`, `/markdown-editor`, and `/template` each serve their page
directly. There are no `/:sessionId` routes — each page type has exactly one
session. `/editor` responds with a permanent redirect to `/text-editor`.
`/template` and all `/api/template/*` endpoints keep their current contract.

### D7 — beforeunload protects untitled sessions only

If a session does not have a valid custom title and the editor contains modified
content, a `beforeunload` confirmation prompt is triggered when attempting to
close or navigate away from the tab. Titled sessions are automatically persisted
via the versioning engine on visibility change / page unload, so no
`beforeunload` warning is needed.

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
(conditional persistence, title validation, versioning FIFO, deduplication,
write failure); `test/routes.test.js` gains cases for `/text-editor`, the
`/editor` redirect, and `/markdown-editor`;
`test/shared-page-header.test.js` asserts the header module renders the declared
options and title using the mock-DOM pattern already used for the markdown
editor. Existing `/api/template/*` tests stay as they are.

### D11 — Title validation and immutability

The title textbox displays "DevToolKit" as a placeholder. A title is considered
valid when it is non-empty, non-whitespace-only, and differs from the default
placeholder (case-insensitive comparison against "DevToolKit" / "Devtoolkit").
The input stays editable while focused, even after the value becomes valid, so
the user can type the complete title. When the input loses focus with a valid
title, it is set to `disabled="true"` and cannot be edited for the lifetime of
that session. This prevents accidental renames and makes the title a stable
identifier for the session in the gallery.

### D12 — Conditional persistence

No session data is written to `localStorage` until the user provides a valid
title. While untitled:
- Content changes are held in-view only.
- `beforeunload` fires if there are unsaved changes (D7).
- The session is not visible in the home page gallery.

Once a valid title is provided:
- The session is registered with that title.
- Persistence is enabled: the versioning engine (D4) writes to `localStorage`
  on visibility change / page unload.
- The title input is disabled once it loses focus with a valid title (D11).

### D13 — Version snapshots on visibility change

A version snapshot is evaluated and saved when the user navigates away from the
tab/window (page unload, tab switch, visibility change). Before saving:
1. Check if the current content attributes differ from the most recent version
   in the `versions` array (excluding `updatedDate`).
2. If identical: no duplicate snapshot is created.
3. If different: create `{ updatedDate: <ISO-8601>, content, [variables] }`,
   push to `versions`, drop the oldest entry if `versions.length > 3`.
4. Write the updated session to `localStorage`.

### D14 — Home page session gallery

The home page (`/`) reads all `devtoolkit:sessions:*` keys from `localStorage`
and renders saved sessions as gallery cards. The existing gallery data (pieces)
is replaced by session data:

- **Filters**: replace category buttons with kind buttons (one per session kind:
  `text-editor`, `markdown-editor`, `template`, plus "All").
- **Card `<h2>`**: populated with the session's `title` as a link to its page
  (`/text-editor`, `/markdown-editor`, or `/template`). The target page restores
  the session's stored content on load, including template text and variables.
- **Card `<p>`**: populated with the session's `kind` · latest `updatedDate`
  (formatted as relative or absolute date).
- **Remove button (×)**: clicking deletes the session from `localStorage` and
  removes the card from the gallery. This calls `localStorage.removeItem` for
  the corresponding key.
- **Search**: filters by title text.
- **Empty state**: shown when no saved sessions exist, as a text-only message
  with no folder icon or other decorative icon.

## Risks / Trade-offs

- Two session models (server `Map` and browser storage) coexist → pages never
  call the API, the API stays covered by its tests, and the follow-up removal is
  recorded as an open question rather than done here.
- `localStorage` can be unavailable, full, or cleared by the user → D9 fallback;
  stored work persists until explicitly deleted by the user.
- Quill restores stored HTML, which is attacker-controlled only if the user
  pastes hostile content into their own browser → treat stored content as
  untrusted when importing it into the editor and keep the existing Quill
  configuration rather than evaluating markup.
- Version snapshots on `visibilitychange` may not fire in all browsers (mobile
  Safari background kill, process termination) → best-effort; `beforeunload` is
  used as a secondary trigger. Documented as a known limitation.
- Deleting a session from the gallery is permanent with no undo → accepted,
  consistent with the existing "Clear all" behavior. The gallery's × button
  removes the `localStorage` key immediately.
- Title immutability means the user cannot rename a session after creating it →
  accepted as a deliberate simplification; the user can delete and re-create.

## Migration Plan

1. Add `browser-session.js` and `page-header.js` with their unit tests.
2. Rename `public/editor.html` to `public/text-editor.html`, add the text
   editor's page script, and update `server.js` routes and the home page link.
3. Adopt the shared header on all three pages: replace duplicated header markup,
   move template actions into the dropdown, and add the title textbox with
   validation and immutability.
4. Point each page's title/content at the browser store with conditional
   persistence and versioning, leaving `/api/template/*` untouched.
5. Rewire the home page gallery to read saved sessions from `localStorage`,
   render kind filters and session cards with title links, and support delete.

Rollback: each step is an independent commit, and because the server API is
untouched, reverting steps 3–5 restores the previous behavior without a data
migration.

## Open Questions

- Whether the now-dormant `/api/template/*` endpoints should eventually be
  removed once nothing calls them.
- Which additional pages should adopt the shared header next.
