# Tasks

## 1. Gallery data module

- [x] 1.1 Create `public/static/scripts/gallery-data.js` as an ES module exporting `CATEGORIES` (the `All` option plus the 5 source categories) and `PIECES` (the 8 pieces, each with `id`, `title`, `category`, `glaze`, `clay`, and an `image` set to a reachable placeholder URL rather than a local binary path), ported from `bootstrap-gallery/src/data.js`. Verify with `node --input-type=module -e "import('./public/static/scripts/gallery-data.js').then(m => console.log(m.CATEGORIES.length, m.PIECES.length))"`, which must print `6 8`.

## 2. Home page markup

- [x] 2.1 Rewrite `public/index.html` to host the gallery: keep the existing `<head>` structure, the DevToolkit navbar markup (`nav.navbar.navbar-expand-lg.navbar-dark.bg-dark` with the `Devtoolkit` brand linking to `/` without saved buttons), and the Bootstrap 5.3.0-alpha1 CDN `<link>` and bundle `<script>`; add the gallery header (eyebrow, heading, lead); add the controls (`#filters`, `#search` with a visible text label) and position a "New" dropdown button (`data-bs-toggle="dropdown"`) containing links to `/template`, `/editor`, and `/markdown-editor` directly to the right of the search bar; add `#resultCount`, `#gallery`, `#emptyState` with `#resetFilters`, and DevToolkit's standard footer; reference the page behavior with `<script type="module" src="/static/scripts/gallery.js"></script>`. Verify by grepping the file for the navbar classes, `data-bs-toggle="dropdown"`, "New", each element ID, and the module script reference.

- [x] 2.2 Add `test/gallery.test.js` using `node:test` and `node:assert/strict`, following the existing `test/routes.test.js` and `test/markdown-editor.test.js` styles: import the `app` from `../server` and assert `GET /` returns 200 and the body contains `Devtoolkit`, the navbar classes, `data-bs-toggle="dropdown"`, the "New" button text, the `/template`, `/editor`, and `/markdown-editor` links, the gallery element IDs, and `/static/scripts/gallery.js`; also read `public/static/scripts/gallery-data.js` and assert `CATEGORIES` includes `All` and `PIECES` length is 8. Verify with `npm test`, which must pass.

## 3. Gallery behavior script

- [x] 3.1 Implement `public/static/scripts/gallery.js` as an ES module: import `{ CATEGORIES, PIECES }` from `./gallery-data.js`; hold the render state (`category`, `query`, a `removed` Set); render the filter buttons with an active indication; render the result count and toggle the empty state; handle filter, search, reset, and per-piece remove interactions; render each piece card with an "X" remove button in the top-right corner (`position-absolute top-0 end-0`) without heart/save icons; and render each piece image as `<img src="${piece.image}" alt="${title}, ${glaze} glaze" class="img-thumbnail">`. Verify with `node --check public/static/scripts/gallery.js` (syntax) and `npm test`.

- [x] 3.2 Extend `test/gallery.test.js` with assertions over `public/static/scripts/gallery.js` covering the required behaviors present in the implementation: it imports `./gallery-data.js`; it renders the `img-thumbnail` image markup with an `alt`; it renders the top-right remove button without heart icons; and it implements the filter, search, remove, reset, result-count, and empty-state paths. Verify with `npm test`, which must pass.

## 4. Integration verification

- [x] 4.1 Run the full suite with `npm test` and start the server with `node server.js`, then `curl -s http://localhost:8080/` and confirm the response is the gallery home page carrying the DevToolkit navbar, standard footer, and the gallery markup, and that `curl -s -o /dev/null -w "%{http_code}"` returns 200 for `/`, `/template`, `/editor`, and `/markdown-editor`. Perform a manual browser smoke check of `/` confirming the "New" dropdown reveals the three tool links and clicking redirects to each page, and the category filters, search, top-right X remove button, reset, result count, and empty state all work.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived result and that `openspec/specs/gallery-home-page/spec.md` is created on archive.
