# Proposal

## Why

DevToolkit's `/` route currently serves a minimal welcome page that only lists links to the bundled tools, while the separate `bootstrap-gallery` project already contains a polished, interactive Bootstrap gallery index page ("Kiln & Clay"). Users want a single, richer DevToolkit home page that presents that gallery without losing DevToolkit's own chrome: the existing dark navbar and the Bootstrap version DevToolkit already ships.

## What Changes

- Replace the content served at `/` (the current `public/index.html` welcome/jumbotron and tool card) with a ported version of the `bootstrap-gallery` index page, while keeping DevToolkit's existing navbar markup (`nav.navbar.navbar-expand-lg.navbar-dark.bg-dark` with the `Devtoolkit` brand) and its Bootstrap 5.3.0-alpha1 CDN stylesheet/script links.
- Extend the DevToolkit navbar with a "+" dropdown button that reveals the DevToolkit tool links — Template, Editor, and Markdown Editor — preserving access to the tools that the old welcome page listed.
- Port the gallery's client-side interactivity as dependency-free vanilla JavaScript (an ES module under `public/static/scripts/`): category filters, free-text search, saved/favorites toggle with a visible count, per-piece remove, and reset filters with an empty state.
- Port the gallery's piece data (8 pieces across 5 categories) into a DevToolkit-served data module.
- Render each piece image as `<img src="..." alt="..." class="img-thumbnail">`; do **not** copy `bootstrap-gallery`'s binary assets into DevToolkit.
- Drop `bootstrap-gallery`'s extra front-end dependencies (Bootstrap Icons, Google Fonts) and use DevToolkit's existing Bootstrap only, replacing icon glyphs (`bi bi-search`, `bi bi-cup`) with text/Unicode cues.
- Keep the Express routes for `/template`, `/editor`, and `/markdown-editor` and their pages unchanged; only the `/` page content and the static assets it references change.

## Capabilities

### New Capabilities

- `gallery-home-page`: The DevToolkit home page served at `/` — its navbar (including the "+" tool-links dropdown) and the interactive ceramics gallery (header, category filters, search, result count, image cards, saved/favorites toggle, remove, empty state, and reset).

### Modified Capabilities

*(none — no existing capability's requirements change)*

## Impact

- `public/index.html` — rewritten to host the gallery while retaining the existing DevToolkit navbar and Bootstrap CDN references.
- `public/static/scripts/gallery.js` (new) — vanilla ES module implementing filters, search, favorites, remove, and reset.
- `public/static/scripts/gallery-data.js` (new) — `CATEGORIES` and `PIECES` data definitions.
- No Express route or API changes: `server.js` is unchanged and `express.static(public)` already serves the new assets.
- No new npm dependencies and no bundler introduced (the page loads a plain ES module, matching the existing `public/static/scripts/*.js` convention).
- Reference sources (read-only, not modified): `../bootstrap-gallery/index.html`, `../bootstrap-gallery/src/main.js`, `../bootstrap-gallery/src/data.js`.
- No image binaries are added to the repository.
