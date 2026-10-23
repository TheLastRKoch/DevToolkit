# Tasks

## 1. Server Routing

- [ ] 1.1 Add `/list-compare` and `/list-compare/:id` GET endpoints to `server.js` using `servePage` and `serveSessionPage`, and verify routes respond with 200 for valid requests and 404 for non-numeric session IDs via route tests.

## 2. View Template and Script Separation

- [ ] 2.1 Create `public/list-compare.html` structured with DevToolKit navbar, shared page header container (`#pageHeader`), List A and List B input cards, controls bar, results section, help accordion, standard footer, and external script references; verify HTML contains no inline script logic.
- [ ] 2.2 Create `public/static/scripts/list-compare.js` containing list comparison, deduplication, case-insensitivity, whitespace trimming, regex text replacement, file loading, and text export utilities; verify parsing and comparison logic works across sample inputs.

## 3. Browser Session and Shared Header Integration

- [ ] 3.1 Bind `public/static/scripts/list-compare.js` to `DevToolkitSessions.openStore('list-compare', ...)` to stage and restore List A and List B contents serialized within the session `content` property; verify inputs restore on page reload.
- [ ] 3.2 Implement auto-snapshotting on page hide/visibility change, beforeunload warnings for untitled dirty sessions, and URL updates upon first title save; verify snapshot versions are preserved.
- [ ] 3.3 Initialize `DevToolkitPageHeader` on `#pageHeader` with title binding and the "Clear all" dropdown option; verify selecting "Clear all" empties inputs and results while preserving title.

## 4. Home Gallery and Navigation Integration

- [ ] 4.1 Update `public/index.html` New dropdown menu to include a link to `/list-compare`; verify the item renders and links to the ID-less route.
- [ ] 4.2 Update `public/static/scripts/gallery.js` to add `'list-compare'` to `KINDS` and map it to `/list-compare` in `PAGE_BY_KIND`; verify kind filter buttons include `list-compare` and filter saved sessions.

## 5. Verification and Integration Testing

- [ ] 5.1 Add `openListComparePage` test helper in `test/helpers/pages.js` with mock DOM elements and session integration hooks.
- [ ] 5.2 Add unit and integration tests in `test/list-compare-page.test.js` covering route serving, session persistence, input restoration, clear all action, and gallery listing.
- [ ] 5.3 Run full test suite (`npm test`) to verify all existing and new tests pass without regressions.
