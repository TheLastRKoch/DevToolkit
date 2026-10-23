# Proposal

## Why

DevToolKit provides browser-side utility tools (Template Editor, Text Editor, and Markdown Editor) with session persistence and a unified gallery. A standalone client-side list comparison tool (`list-compare.html`) exists outside the application structure. Integrating List Compare into DevToolKit allows developers to perform list deduplication, differences, intersections, and text replacements while benefiting from the same browser session persistence, shared page header, and home gallery integration available in other views.

## What Changes

- Integrate List Compare as a core view in DevToolKit served at `/list-compare` (new fresh session) and `/list-compare/:id` (saved session).
- Separate presentation and logic by migrating inline JavaScript from `list-compare.html` into a dedicated script module at `public/static/scripts/list-compare.js`.
- Adopt DevToolKit UI and architectural conventions:
  - Integrate the shared page header (`#pageHeader`) with title textbox and options menu ("Clear all").
  - Adopt DevToolKit standard navbar and footer.
  - Bind List A and List B text box state to the browser session store (`devtoolkit:sessions:list-compare:<id>`).
  - Restore List A and List B contents when opening an existing session or upon page reload.
  - Automatically snapshot session state upon navigation away (visibility changes, pagehide) up to 3 versions.
  - Protect unsaved work on untitled sessions with `beforeunload` warnings.
- Expose List Compare in the home page (`/`):
  - Add "List Compare" to the "New" dropdown menu linking to `/list-compare`.
  - Add `list-compare` to the gallery session kind filter buttons and kind-to-route mappings.
  - Display saved List Compare session cards linking to `/list-compare/<id>`.
- Add server routes in `server.js` to serve `/list-compare` and `/list-compare/:id`.

## Capabilities

### New Capabilities
- `list-compare-page`: Defines the page structure, externalized script architecture, list comparison operations (deduplication, differences, intersections, text replacement, file import, text export), and shared header integration for the List Compare view.

### Modified Capabilities
- `session-gallery`: Updates the home page gallery to include `list-compare` as an available kind filter, adds "List Compare" to the "New" session dropdown, and renders saved List Compare session cards linking to `/list-compare/<id>`.
- `browser-side-sessions`: Extends browser session management to support the `list-compare` kind, persisting both List A and List B contents across page reloads and sessions under `devtoolkit:sessions:list-compare:<id>`.
- `shared-page-header`: Extends the shared header options contract to specify that the List Compare page declares the "Clear all" option.

## Impact

- **Affected Files**:
  - `server.js`: Adds GET routes for `/list-compare` and `/list-compare/:id`.
  - `public/list-compare.html`: Standardized view referencing shared CSS/JS assets, page header, and external script.
  - `public/static/scripts/list-compare.js`: New script implementing list comparison logic and session management.
  - `public/index.html`: Adds "List Compare" item to the "New" dropdown menu.
  - `public/static/scripts/gallery.js`: Adds `list-compare` to `KINDS` and `PAGE_BY_KIND`.
  - `test/helpers/pages.js`: Adds test harness loader for the List Compare page.
  - `test/list-compare-page.test.js` (and route/integration tests): Comprehensive unit and integration test coverage.
- **Dependencies**: No new external npm dependencies required (uses Bootstrap 5 and vanilla JavaScript).
