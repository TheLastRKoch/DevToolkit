# Tasks

## 1. Browser session store

- [x] 1.1 Refactor `public/static/scripts/browser-session.js` to expose
  `openStore(kind, storage)` with `get`, `save`, `remove`, and `listAll`,
  storing one session document per page type at `devtoolkit:sessions:<kind>`
  shaped `{ title, kind, versions }` (single session per page); verify with
  `node -e "const s=require('./public/static/scripts/browser-session.js')"` that
  the module loads in Node and exports the factory
- [x] 1.2 Implement title validation: reject empty, whitespace-only, and
  default placeholder values (case-insensitive match against "DevToolKit" /
  "Devtoolkit"); implement conditional persistence so `save` only writes to
  `localStorage` when a valid title is provided; verify with tests asserting
  untitled sessions are not persisted and titled sessions are
- [x] 1.3 Implement FIFO versioning: `versions` array keeps the last 3 content
  snapshots; a new version is pushed only when content differs from the most
  recent version (excluding `updatedDate`); when a 4th version would be added,
  the oldest is dropped; verify with tests covering version creation,
  deduplication, and FIFO truncation
- [x] 1.4 Implement graceful degradation when storage is missing or `setItem`
  throws: keep the session in memory for the current page view and signal that
  changes were not persisted; verify with tests using a missing storage object
  and a storage whose `setItem` throws
- [x] 1.5 Implement `listAll(storage)` that reads all `devtoolkit:sessions:*`
  keys from storage and returns an array of `{ kind, title, latestDate }` for
  gallery consumption; verify with tests
- [x] 1.6 Update `test/browser-sessions.test.js` with a fake storage object
  covering 1.1–1.5 (title validation, conditional persistence, versioning,
  FIFO, deduplication, listAll, write failure); verify `npm test` passes

## 2. Shared page header

- [x] 2.1 Refactor `public/static/scripts/page-header.js` exporting
  `initPageHeader({ options, title, onTitleChange })` that renders the Options
  dropdown and title textbox into a single `#pageHeader` mount using one shared
  row layout; verify `test/shared-page-header.test.js` asserts the rendered
  structure for the declared options and title
- [x] 2.2 Render exactly the declared options in the declared order and invoke the
  matching callback on selection, then close the dropdown; verify with tests that
  two different option sets render only their own items and that selecting an
  item calls that item's callback once
- [x] 2.3 Make the header own the dropdown open/close toggle so no page depends on
  Bootstrap's JS bundle; verify with a test asserting the toggle opens and closes
  the menu and with a page-HTML check that `/template` and `/text-editor` no
  longer need `bootstrap.bundle` for the menu to work
- [x] 2.4 Implement the title textbox with placeholder "DevToolKit": typing
  updates `document.title`, an empty or default-matching value falls back to
  `Devtoolkit`, the stored title is shown when the page loads, and
  `onTitleChange` receives each edit; implement title immutability by setting
  `disabled="true"` on the input when it loses focus with a valid title; verify
  with tests for validation, fallback, restoration, and immutability
- [x] 2.5 Add `test/shared-page-header.test.js` using the mock-element pattern from
  `test/markdown-editor.test.js`; verify `npm test` passes the new file
- [x] 2.6 Add `docs/pages.md` documenting the mount point, the configuration shape,
  the per-page option sets, and the title behavior; verify the documented
  configuration example matches the exported signature used in 2.1

## 3. Rename editor to text editor

- [x] 3.1 Rename `public/editor.html` to `public/text-editor.html`, update its
  `<title>` and remove the page-level header markup it will no longer own;
  verify the old file is gone, the new file exists, and the page contains no
  `Editor` label
- [x] 3.2 Update the `/text-editor` route in `server.js` to serve the page
  directly (no session ID routes), and keep `/editor` as a redirect to
  `/text-editor`; verify with `test/routes.test.js` cases asserting the page
  resolves with status 200 and the redirect target
- [x] 3.3 Update `public/index.html` so the entry reads `Text Editor` and links to
  `/text-editor`; verify a route test asserts the home page contains `Text Editor`
  and no `/editor` link
- [x] 3.4 Remove session-ID route cases from `test/routes.test.js` (no more
  `/text-editor/:sessionId`); verify `npm test` passes with the simplified routes

## 4. Template page adopts the shared header and browser session

- [x] 4.1 Replace the `/template` header markup with the `#pageHeader` mount and an
  `initPageHeader` call declaring Clear variables and Clear all; verify
  `public/template.html` contains no title input, dropdown, or session button
  markup of its own and a test asserts the declared option labels
- [x] 4.2 Wire the template actions into the header options (Clear variables, Clear
  all — no "New session"); verify a test asserts each option runs its action
- [x] 4.3 Point template title, template text, and variables at the browser store
  under `devtoolkit:sessions:template` with conditional persistence (title-gated)
  and FIFO versioning; each version stores `{ updatedDate, content, variables }`;
  verify a round-trip test covers template text, variable values, and title, and
  that page scripts contain no remaining fetch calls to `/api/`
- [x] 4.4 Implement visibility-change / page-unload version snapshot for the
  template page: compare current content and variables to the latest version and
  save if changed; implement `beforeunload` only for untitled sessions with
  modified content; verify with tests
- [x] 4.5 Update `docs/template.md` to describe browser-side session storage, the
  shared header row, the dropdown actions, conditional persistence, versioning,
  and the title behavior

## 5. Markdown editor adopts the shared header and browser session

- [x] 5.1 Update the `/markdown-editor` route to serve the page directly (no
  session ID routes); verify with route tests asserting the page resolves with
  status 200
- [x] 5.2 Adopt the shared header on `public/markdown-editor.html` with Clear
  editor; verify the page contains the mount, no duplicated header markup, and
  that the existing `test/markdown-editor.test.js` layout and pane assertions
  still pass
- [x] 5.3 Persist markdown text and title in the browser store under
  `devtoolkit:sessions:markdown-editor` with conditional persistence (title-gated)
  and FIFO versioning; each version stores `{ updatedDate, content }`; restore
  both on load and implement Clear editor as content-only clearing; verify a
  round-trip test covers markdown text and title
- [x] 5.4 Implement visibility-change / page-unload version snapshot for the
  markdown editor: compare current content to the latest version and save if
  changed; implement `beforeunload` only for untitled sessions; verify with tests
- [x] 5.5 Document the markdown editor's options and session behavior in
  `docs/pages.md`; verify the documented option labels match the page's declared
  configuration

## 6. Text editor adopts the shared header and browser session

- [x] 6.1 Adopt the shared header on `public/text-editor.html` with Clear editor,
  and move the editor's content wiring into
  `public/static/scripts/text-editor.js`; verify the page contains the mount, no
  duplicated header markup, and a test asserts the declared option labels with no
  variable-related item
- [x] 6.2 Persist the editor content and title in the browser store under
  `devtoolkit:sessions:text-editor` with conditional persistence (title-gated)
  and FIFO versioning; each version stores `{ updatedDate, content }`; restore
  content on load and treat stored content as untrusted input when importing it
  into the editor; verify a round-trip test covers content and title
- [x] 6.3 Implement visibility-change / page-unload version snapshot for the
  text editor: compare current content to the latest version and save if changed;
  implement `beforeunload` only for untitled sessions; implement Clear editor as
  content-only clearing and keep the title; verify with tests
- [x] 6.4 Document the text editor's options and session behavior in
  `docs/pages.md`; verify the documented option labels match the page's declared
  configuration

## 7. Home page session gallery

- [x] 7.1 Update `public/static/scripts/gallery.js` to read all
  `devtoolkit:sessions:*` keys from `localStorage` instead of static piece data;
  render each saved session as a card with the session's title in `<h2>` and
  `kind · latestDate` in `<p>`
- [x] 7.2 Replace the category filter buttons with session-kind filter buttons
  (one per kind: `text-editor`, `markdown-editor`, `template`, plus "All");
  implement search filtering by title text
- [x] 7.3 Implement session delete: clicking the remove button (×) on a card
  calls `localStorage.removeItem` for that session's key and removes the card
  from the gallery; verify the session is removed from storage
- [x] 7.4 Show the empty state when no saved sessions exist in `localStorage`;
  verify the empty state is displayed and hides when a session is added
- [x] 7.5 Remove the folder icon from the session gallery's empty state in
  `public/index.html`; verify the empty state contains only the message text and
  the reset-filters button, and that `npm test` still passes

## 8. Integration verification

- [x] 8.1 Verify all three pages render the same header row with their own options
  by asserting the header mount and declared option sets for `/template`,
  `/text-editor`, and `/markdown-editor` in one integration test
- [x] 8.2 Verify conditional persistence end to end: one test covers providing a
  valid title enabling persistence, an invalid title preventing persistence, and
  title immutability after focus loss
- [x] 8.3 Verify FIFO versioning end to end: one test covers version creation on
  visibility change, deduplication of unchanged content, and FIFO truncation at 3
  versions
- [x] 8.4 Verify the home page gallery reads saved sessions from `localStorage`,
  renders cards with title/kind/date, filters by kind, and deletes on remove
- [x] 8.5 Verify the legacy and kept URLs (`/editor`, `/template`,
  `/markdown-editor`) still resolve and that the untouched `/api/template/*`
  behavior still passes its existing tests
- [x] 8.6 Run the full suite with `npm test` and confirm every test passes, and
  confirm no page, test, or document still presents the page as `Editor`

## 9. Remove page breadcrumbs

- [x] 9.1 Remove breadcrumb rendering and the `breadcrumb` configuration option
  from `public/static/scripts/page-header.js`, and remove the `breadcrumb`
  declarations from `template.js`, `text-editor.js`, and `markdown-editor.js`;
  verify no page renders a breadcrumb or `aria-label="breadcrumb"`
- [x] 9.2 Update `test/shared-page-header.test.js`, the page tests, the integration
  test, and `test/helpers/pages.js` to expect a header without a breadcrumb;
  verify `npm test` passes
- [x] 9.3 Update `docs/pages.md` and `docs/template.md` to describe the header row
  without a breadcrumb; verify no documented header description mentions a
  breadcrumb

## 10. Fix title lock timing

- [x] 10.1 Update `public/static/scripts/page-header.js` so the title input
  remains editable on every `input` event and commits the trimmed value on
  `blur`; disable the input on blur only when the value is valid and persistence
  is available; verify the input accepts multiple keystrokes while focused
- [x] 10.2 Remove the per-keystroke `header.lockTitle()` calls from
  `template.js`, `text-editor.js`, and `markdown-editor.js` while keeping title
  persistence on each edit; verify the session stores the complete title
- [x] 10.3 Update the header and page tests to type a multi-character title,
  assert the input stays enabled while focused, and assert it is disabled after
  focus is lost; verify `npm test` passes
- [x] 10.4 Update `docs/pages.md` to document that the title locks when the
  textbox loses focus; verify the documented behavior matches the tests

## 11. Link gallery sessions to their pages

- [x] 11.1 Render each gallery card's title as a link in the `<h2>` to the page
  for its kind (`/text-editor`, `/markdown-editor`, `/template`); verify every
  card's link targets the matching route
- [x] 11.2 Verify following a title link opens the page with the session's
  stored content: text editor content, markdown raw text, and template text plus
  variables
- [x] 11.3 Add gallery and page tests for the title links and restored content;
  verify `npm test` passes
- [x] 11.4 Update `docs/pages.md` to document the gallery title links and the
  restored page content

## 12. Center the Options dropdown on desktop

- [x] 12.1 Restructure the shared header row so that at 768 px and wider the
  Options dropdown is centered and the title textbox is right-aligned, while
  below 768 px the title and dropdown stay grouped at the end; verify all three
  pages keep one title and one dropdown
- [x] 12.2 Update the header and page integration tests to assert the desktop
  centering and smaller-screen grouping; verify `npm test` passes
- [x] 12.3 Update `docs/pages.md` to document the desktop-centered dropdown and
  the smaller-screen grouping; verify the documented behavior matches the tests

## Workflow follow-up

- Archive the change once the project's review requirements are satisfied.
- Verify the archived result and that the main specs contain the updated
  `shared-page-header`, `browser-side-sessions`, `text-editor-page`, and new
  `session-gallery` capabilities with the modified requirements applied.