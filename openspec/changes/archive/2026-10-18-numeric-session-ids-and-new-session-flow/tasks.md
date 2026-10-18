# Tasks

## 1. Session store with numeric IDs

- [x] 1.1 Add `sessionKey(kind, id)` and `counterKey(kind)` helpers plus
  `migrateLegacySession(kind, storage)`; verify unit tests cover the per-session
  key shape, migration to ID 1, idempotency, and a corrupt legacy document being
  ignored
- [x] 1.2 Extend `openStore` with `{ sessionId }`, load an existing session by
  ID, start an untitled session when no ID is given, allocate the next per-kind
  ID on the first valid title save, and handle counter/ID collisions; verify
  unit tests cover new sessions, saved sessions, non-reused IDs, and collision
  recovery
- [x] 1.3 Update `listAll` to read only numeric per-session keys and return
  `{ id, kind, title, latestDate }`; verify tests cover multiple sessions of one
  kind and ignore counters and legacy keys
- [x] 1.4 Update `test/browser-sessions.test.js` and `test/helpers/pages.js` for
  the new store API; run `npm test` and verify versioning, title gating, and
  storage-failure behavior still pass
- [x] 1.5 Update the session storage section of `docs/pages.md` for per-session
  keys, the per-kind counter, migration, and ID-less new sessions; verify no
  documented single-key model remains

## 2. Numeric routes and page boot

- [x] 2.1 Add `/<kind>/:id` numeric routes for `template`, `text-editor`, and
  `markdown-editor`, return `404` for non-numeric IDs, and redirect
  `/editor/:id` to `/text-editor/:id`; verify with route tests
- [x] 2.2 Update `template.js`, `text-editor.js`, and `markdown-editor.js` to
  read the numeric route ID, open that session, open a fresh session at
  `/<kind>`, and replace the URL with `/<kind>/<id>` after the first title save;
  verify page tests for new, saved, and unknown IDs on all three pages
- [x] 2.3 Update `test/page-integration.test.js`, the three page tests, and
  `test/routes.test.js` for ID routes and URL updates; run `npm test` and verify
  every route and page test passes
- [x] 2.4 Update `docs/pages.md` and `docs/template.md` for `/<kind>` versus
  `/<kind>/<id>` and the legacy `/editor/:id` redirect; verify the documented
  routes match the route tests
- [x] 2.5 Change the script and favicon URLs in `public/text-editor.html` and
  `public/markdown-editor.html` to absolute `/static/...` paths; verify requests
  to `/text-editor/1` and `/markdown-editor/1` serve those absolute URLs and
  that the referenced scripts resolve with status `200`

## 3. Gallery sessions by ID

- [x] 3.1 Update `gallery.js` to render one card per `{ id, kind }` with the
  title linking to `/<kind>/<id>` and to delete only
  `devtoolkit:sessions:<kind>:<id>`; verify gallery tests cover multiple cards
  of one kind and per-ID deletion
- [x] 3.2 Verify the New dropdown links to `/<kind>` and that following a New
  link opens an empty untitled session rather than a saved one; add a test that
  New links contain no ID segment and the destination starts empty
- [x] 3.3 Update the gallery section of `docs/pages.md` for ID links, multiple
  cards per kind, delete-by-ID, and fresh New sessions; verify the documented
  behavior matches the gallery tests

## 4. Integration verification

- [x] 4.1 Run `npm test` and verify the full suite passes, including store,
  routes, gallery, and restoration for all three page kinds
- [x] 4.2 Verify legacy migration end to end for each kind: seed
  `devtoolkit:sessions:<kind>`, open the gallery or page, confirm the session
  appears at ID 1 and the legacy key is removed; verify the kept
  `/api/template/*` tests still pass
- [x] 4.3 Search the implementation and docs for remaining assumptions that a
  page owns exactly one session per kind; verify only intentional legacy
  migration references remain

## Workflow follow-up

- Archive the change once the project's review requirements are satisfied.
- Verify the archived result and that the main specs contain the updated
  `browser-side-sessions`, `session-gallery`, `text-editor-page`, and
  `dynamic-text-variable-template-processor` requirements.
