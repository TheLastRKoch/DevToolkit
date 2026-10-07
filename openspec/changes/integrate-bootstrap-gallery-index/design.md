# Design

## Context

See `proposal.md — Why` for motivation. Current state and constraints that shape the approach:

- DevToolkit is a plain Express app (`server.js`) that serves `public/` via `express.static` and sends `public/index.html` for `/`. Pages are static HTML, each carrying its own navbar markup, an inline `<style>` block, Bootstrap 5.3.0-alpha1 from the jsDelivr CDN, and optional scripts under `public/static/scripts/` (`template.js`, `markdown-editor.js`, `quill.js`).
- `bootstrap-gallery` is a Vite app: `index.html` loads `<script type="module" src="/src/main.js">`, and `main.js` imports `bootstrap/dist/css/bootstrap.min.css`, `bootstrap-icons/font/bootstrap-icons.min.css`, and `./data.js`. It has **no** custom CSS file — the `toolbar`, `piece-card`, `swatch`, and `--swatch`/`--delay` hooks are unstyled, so the visuals come entirely from Bootstrap utility classes.
- DevToolkit has no bundler and no npm dependencies beyond `express`.
- The navbar is duplicated per page; the home page's copy is `nav.navbar.navbar-expand-lg.navbar-dark.bg-dark` with the `Devtoolkit` brand linking to `/`.
- Existing routes and pages for `/template`, `/editor`, and `/markdown-editor` must remain unchanged.

## Goals / Non-Goals

**Goals:**
- Serve the gallery as `public/index.html` at `/` using DevToolkit's existing navbar markup and Bootstrap CDN.
- Preserve the gallery's client-side interactivity using dependency-free vanilla JavaScript loaded as a browser-native ES module.
- Add a navbar "+" dropdown that exposes the DevToolkit tool links.

**Non-Goals:**
- No Vite, bundler, or build step; no framework (React or otherwise).
- No changes to the tool pages, their routes, or `server.js`.
- No server-side or persisted favorites state — favorites are session-only in memory, matching the source.
- No pixel-perfect reproduction of the source's unstyled custom-CSS hooks; Bootstrap utilities are authoritative.

## Decisions

### 1. Port to browser-native ES modules instead of Vite

Load `<script type="module" src="/static/scripts/gallery.js"></script>` and import the data with `import { CATEGORIES, PIECES } from './gallery-data.js'`. `express.static` serves `.js` with the correct MIME type and resolves the relative import without a bundler, and the separate-file convention matches `template.js`/`markdown-editor.js`.

*Alternative considered*: inline all script content in `index.html`. Rejected — diverges from the repo convention and is harder to maintain and review.

### 2. Depend only on DevToolkit's Bootstrap

Keep the existing Bootstrap 5.3.0-alpha1 CDN `<link>` and `<script>` and drop Bootstrap Icons and Google Fonts. Replace the search icon (`bi bi-search`) with a visible text label and the empty-state icon (`bi bi-cup`) with a plain text/Unicode cue.

*Alternative considered*: keep Bootstrap Icons via CDN. Rejected per the requirement to reuse only DevToolkit's Bootstrap and to avoid new external requests.

### 3. Render images as `<img class="img-thumbnail">` with URL sources, without adding binaries

Each piece keeps an `image` field holding a URL; the card renders `<img src="${piece.image}" alt="${title}, ${glaze} glaze" class="img-thumbnail">`. No PNGs are copied into DevToolkit. Because the source's local `/images/*.png` paths would 404 once the binaries are intentionally omitted, the ported `image` values must be reachable placeholder URLs rather than the source's local paths.

*Alternative considered*: copy the eight PNGs into `public/images/`. Rejected per the user's direction to use an `<img class="img-thumbnail">` placeholder instead of adding the images.

*Trade-off*: a placeholder URL may require network access; the descriptive `alt` text guarantees the page remains meaningful if the image does not load, and `img-thumbnail` keeps the layout stable.

### 4. Navbar "+" dropdown uses Bootstrap's dropdown component

Mark up the button with `data-bs-toggle="dropdown"` and rely on the already-loaded `bootstrap.bundle.min.js`. No custom toggle script is needed, and it stays consistent with DevToolkit's Bootstrap version.

*Alternative considered*: hand-rolled show/hide JS. Rejected as unnecessary duplication of framework behavior.

### 5. In-memory state and a data module

`gallery-data.js` exports `CATEGORIES` and `PIECES` (8 pieces across 5 categories) ported from `bootstrap-gallery/src/data.js`. `gallery.js` holds the render state (`category`, `query`, `favoritesOnly`, a `favorites` Set, a `removed` Set) and re-renders on every change, mirroring the source model. No server calls are introduced.

### 6. Preserve functional element IDs

Keep the source element IDs (`filters`, `search`, `gallery`, `resultCount`, `emptyState`, `resetFilters`, `favToggle`, `favCount`) so the ported script is a near-direct translation that is easy to review. The unstyled `toolbar`/`piece-card`/`swatch` classes may be retained as hooks or replaced by Bootstrap utilities; keeping them is harmless.

## Risks / Trade-offs

- **Placeholder images may not load or may need network access** → The `alt` attribute is always present and `img-thumbnail` preserves layout, so the page degrades gracefully; use a reachable placeholder URL.
- **Bootstrap dropdown requires the bundle JS** → The current `index.html` already includes `bootstrap.bundle.min.js`; keep that `<script>` when rewriting the page.
- **Dropping Google Fonts changes the typeface** → Acceptable; Bootstrap's default font stack applies and no behavior changes.
- **Favorites are lost on refresh** → Matches the source behavior; persisted favorites are out of scope.
- **The old welcome page's tool card disappears** → Mitigated by the navbar "+" dropdown that exposes the same three tool links.

## Migration Plan

1. Add `public/static/scripts/gallery-data.js` (categories and pieces) and `public/static/scripts/gallery.js` (state and rendering).
2. Rewrite `public/index.html`: keep the `<head>` structure, navbar markup, and Bootstrap CDN references; add the "+" tool-links dropdown, the gallery header, controls, grid, empty state, and footer; reference the gallery module.
3. No server changes are required; `express.static` already serves the new scripts.
4. Rollback is restoring the previous `public/index.html` and deleting the two new script files.
5. Validate with the existing `npm test` suite and a manual load of `/`.

## Open Questions

- Which placeholder image source to use (an external placeholder service versus a small committed SVG placeholder) — deferred; as long as the rendering uses `img-thumbnail` with a descriptive `alt`, any reachable URL satisfies the spec.
