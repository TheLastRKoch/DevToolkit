# Tasks

## 1. Browser session store

- [x] 1.1 Add `public/static/scripts/browser-session.js` exposing
  `openStore(pageType, storage)` with `get`, `ensure`, `allocateId`, `save`, and
  expiry handling, storing one `{ version, nextId, sessions }` document per page
  type under `devtoolkit:sessions:<pageType>`; verify with
  `node -e "const s=require('./public/static/scripts/browser-session.js')"` that
  the module loads in Node and exports the factory
- [x] 1.2 Implement session records as `{ name, updatedAt, expiresAt, data }` with
  `expiresAt = updatedAt + 30 days`, dropping expired records on read and
  refreshing `updatedAt`/`expiresAt` on every write; verify the expiry, refresh,
  and discard cases in `test/browser-sessions.test.js` pass
- [x] 1.3 Implement per-page and per-session isolation plus default session
  creation named `Devtoolkit`, and `allocateId` returning an identifier greater
  than every stored identifier for that page only; verify with tests asserting
  that template, text editor, and markdown editor session `1` never share state
  and that allocation for one page does not move another page's counter
- [x] 1.4 Implement graceful degradation when storage is missing or `setItem`
  throws: keep the session in memory for the current page view and signal that
  changes were not persisted; verify with tests using a missing storage object
  and a storage whose `setItem` throws
- [x] 1.5 Add `test/browser-sessions.test.js` with a fake storage object covering
  1.1–1.4; verify `npm test` passes the new file and the existing 16 tests still
  pass

## 2. Shared page header

- [x] 2.1 Add `public/static/scripts/page-header.js` exporting
  `initPageHeader({ breadcrumb, options, pageName, onPageNameChange })` that
  renders the breadcrumb, Options dropdown, and page-name textbox into a single
  `#pageHeader` mount using one shared row layout; verify
  `test/shared-page-header.test.js` asserts the rendered structure for a two-item
  breadcrumb
- [x] 2.2 Render exactly the declared options in the declared order and invoke the
  matching callback on selection, then close the dropdown; verify with tests that
  two different option sets render only their own items and that selecting an
  item calls that item's callback once
- [x] 2.3 Make the header own the dropdown open/close toggle so no page depends on
  Bootstrap's JS bundle; verify with a test asserting the toggle opens and closes
  the menu and with a page-HTML check that `/template` and `/text-editor` no
  longer need `bootstrap.bundle` for the menu to work
- [x] 2.4 Implement the page-name textbox: typing updates `document.title`, an
  empty value falls back to `Devtoolkit`, the stored name is shown when the page
  loads, and `onPageNameChange` receives each edit; verify with tests for all four
  behaviors
- [x] 2.5 Add `test/shared-page-header.test.js` using the mock-element pattern from
  `test/markdown-editor.test.js`; verify `npm test` passes the new file
- [x] 2.6 Add `docs/pages.md` documenting the mount point, the configuration shape,
  the per-page option sets, and the page-name behavior; verify the documented
  configuration example matches the exported signature used in 2.1

## 3. Rename editor to text editor

- [x] 3.1 Rename `public/editor.html` to `public/text-editor.html`, update its
  `<title>` and remove the page-level breadcrumb and dropdown markup it will no
  longer own; verify the old file is gone, the new file exists, and the page
  contains no `Editor` breadcrumb label
- [x] 3.2 Add the `/text-editor` and `/text-editor/:sessionId` routes in
  `server.js`, redirect `/text-editor` to `/text-editor/1`, answer an invalid
  identifier with status 400, and keep `/editor` as a redirect to `/text-editor`;
  verify with `test/routes.test.js` cases asserting the page resolves with status
  200, the redirect targets, and the 400 for `/text-editor/abc`
- [x] 3.3 Update `public/index.html` so the entry reads `Text Editor` and links to
  `/text-editor`; verify a route test asserts the home page contains `Text Editor`
  and no `/editor` link
- [x] 3.4 Add the renamed-route, legacy-redirect, and invalid-identifier cases to
  `test/routes.test.js`; verify `npm test` passes them together with the unchanged
  `/api/template/*` tests

## 4. Template page adopts the shared header and browser session

- [x] 4.1 Replace the `/template` header markup with the `#pageHeader` mount and an
  `initPageHeader` call declaring New session, Clear variables, and Clear all;
  verify `public/template.html` contains no breadcrumb, title input, or session
  button markup of its own and a test asserts the declared option labels
- [x] 4.2 Move the template actions into the header options and wire them to the
  existing clear and new-session logic; verify a test asserts each option runs its
  action and that a new session opens a tab at `/template/<id>` with an
  identifier greater than every stored one
- [x] 4.3 Point template page name, template text, and variables at the browser
  store under `devtoolkit:sessions:template`, removing the page's
  `/api/template/*` calls; verify a round-trip test covers template text, variable
  values, and name, and that page scripts contain no remaining fetch calls to
  `/api/`
- [x] 4.4 Keep the dirty-tracking and `beforeunload` behavior working with "dirty"
  meaning "edit not yet persisted"; verify a test asserts the flag is set on edit
  and cleared after a successful store write
- [x] 4.5 Update `docs/template.md` to describe browser-side session storage, the
  shared header row, the dropdown actions, the 30-day expiry, and the page-name
  behavior; verify by following the documented steps that a reload and a server
  restart both preserve session state

## 5. Markdown editor adopts the shared header and browser session

- [x] 5.1 Add the `/markdown-editor/:sessionId` route and redirect
  `/markdown-editor` to `/markdown-editor/1`; verify with route tests asserting
  the page resolves with status 200 at both paths and 400 for an invalid
  identifier
- [x] 5.2 Adopt the shared header on `public/markdown-editor.html` with New session
  and Clear editor; verify the page contains the mount, no duplicated breadcrumb,
  and that the existing `test/markdown-editor.test.js` layout and pane assertions
  still pass
- [x] 5.3 Persist markdown text and page name in the browser store under
  `devtoolkit:sessions:markdown-editor`, restore both on load, and implement Clear
  editor as content-only clearing; verify a round-trip test covers markdown text
  and name, and that Clear editor keeps the stored name
- [x] 5.4 Document the markdown editor's options and session behavior in
  `docs/pages.md`; verify the documented option labels match the page's declared
  configuration

## 6. Text editor adopts the shared header and browser session

- [x] 6.1 Adopt the shared header on `public/text-editor.html` with New session and
  Clear editor, and move the editor's content wiring into
  `public/static/scripts/text-editor.js`; verify the page contains the mount, no
  duplicated breadcrumb, and a test asserts the declared option labels with no
  variable-related item
- [x] 6.2 Persist the editor content and page name in the browser store under
  `devtoolkit:sessions:text-editor`, restoring the content on load and treating
  stored content as untrusted input when importing it into the editor; verify a
  round-trip test covers content and name and that stored markup is not executed
  as script
- [x] 6.3 Implement Clear editor as content-only clearing and keep the page name;
  verify a test asserts the content is emptied and the stored name is unchanged
- [x] 6.4 Document the text editor's options and session behavior in
  `docs/pages.md`; verify the documented option labels match the page's declared
  configuration

## 7. Integration verification

- [x] 7.1 Verify all three pages render the same header row with their own options
  by asserting the header mount and declared option sets for `/template/1`,
  `/text-editor/1`, and `/markdown-editor/1` in one integration test
- [x] 7.2 Verify browser-side session independence end to end: one test covers the
  same identifier on the three pages keeping separate name and content, and expiry
  after 30 days starting a fresh session
- [x] 7.3 Verify the legacy and kept URLs (`/editor`, `/template`, `/template/1`,
  `/markdown-editor`) still resolve and that the untouched `/api/template/*`
  behavior still passes its existing tests
- [x] 7.4 Run the full suite with `npm test` and confirm every test passes, and
  confirm no page, test, or document still presents the page as `Editor`

## Workflow follow-up

- Archive the change once the project's review requirements are satisfied.
- Verify the archived result and that the main specs contain the new
  `shared-page-header`, `browser-side-sessions`, and `text-editor-page`
  capabilities with the modified requirements applied.
