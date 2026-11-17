# Design

## Context

See `proposal.md` and `specs/code-editor-page/spec.md` for motivation and
required behavior. Relevant constraints of the current codebase:

- Pages are static HTML under `public/` served by `server.js`; each page loads
  classic UMD scripts (`browser-session.js`, `page-header.js`, page script).
- There is no bundler, build step, or frontend dependency manifest; the only npm
  dependency is Express. Third-party browser libraries are loaded from CDNs
  (Quill, marked, Bootstrap CSS).
- Tests run the real page scripts against a hand-rolled mock DOM
  (`test/helpers/mock-dom.js`), injecting library globals as stubs (the Quill
  stub is the existing precedent).
- The session store persists a plain string `content`, so no store changes are
  needed.

## Goals / Non-Goals

**Goals:**

- Mount CodeMirror 6 with `basicSetup` in a page that reuses the shared header
  and session store unchanged.
- Keep the language detector and most page logic unit-testable in Node without a
  browser or network access.
- Keep the code surface a plain-text editor: stored content round-trips exactly.

**Non-Goals:**

- No server-side persistence, no new API endpoints, no session schema changes.
- No build pipeline, bundler, or npm runtime dependency for the browser.
- No language server features (linting, diagnostics, completion beyond the
  built-in basic-setup completion), no multi-file or file-system support.
- No persistence of the manually selected language; it is a view-only override
  that resets to `Auto` on reload.

## Decisions

### Decision: CodeMirror 6 as ES modules from a pinned import map

CodeMirror 6 is ESM-only (`codemirror`, `@codemirror/state`, `@codemirror/view`,
`@codemirror/language`, `@codemirror/lang-*`). The page declares an import map in
`public/code-editor.html` pinning every package to an exact version on
`esm.sh`, and `code-editor-surface.js` imports `codemirror` plus dynamic
`import()` calls for language packages.

Alternatives considered:

- **CodeMirror 5 via a classic CDN script** — simpler loading, but its API and
  packaging are legacy and the requested basic example is CodeMirror 6.
- **Bundling CodeMirror into the repo** — would require committing a build
  artifact or adding a bundler; against this project's no-build convention.
- **jsDelivr `+esm` per package** — each package bundles its own
  `@codemirror/state`, creating duplicate module instances and CM6 runtime
  errors.

Pinning all packages in one import map keeps a single instance of
`@codemirror/state`; a startup smoke check logs an error if the surface fails to
construct.

### Decision: Split the page into a testable classic script and a thin ESM surface

Three new scripts:

- `code-language.js` (classic UMD): pure `detectLanguage(text)` heuristic plus
  the supported-language catalog. No DOM or CM6 dependency, so Node tests call
  it directly.
- `code-editor.js` (classic UMD): page wiring — session store, shared header,
  status bar, language override state, character count, add/update/leave
  handlers. It consumes an editor adapter exposed as
  `window.DevToolkitCodeEditorSurface.create(...)`. Load order: classic scripts
  define `window.DevToolkitCodeEditor.start`, the ESM module registers the
  surface and then calls `start()`.
- `code-editor-surface.js` (ESM): imports CodeMirror 6, implements the adapter
  `{ getValue, setValue, focus, setLanguage, destroy }`, forwards doc changes and
  computes the character count via `state.doc.length`.

Tests stub the surface global exactly as they stub Quill, so page logic is
verifiable without network access.

Alternative considered: a single ESM page script — rejected because the Node
test harness evaluates classic script text in a sandbox and cannot resolve
`import`.

### Decision: Use a `Compartment` for language reconfiguration

The language extension lives in a CM6 `Compartment`. Auto-detection and manual
selection both dispatch a `reconfigure` effect with the chosen language support,
so switching languages never recreates the editor and preserves cursor, undo
history, and selection.

Language packages are loaded lazily on first use and cached. `basicSetup`
supplies line numbers, history, bracket matching, search, and the active line,
so no manual extension assembly is needed.

### Decision: Heuristic auto-detection over a fixed supported set

`detectLanguage` scores the content and returns a stable language id from:
Plain Text (fallback), JavaScript, TypeScript, JSON, HTML, CSS, Markdown,
Python, SQL, XML.

Ordering and signals:

1. `JSON.parse` succeeds and the trimmed content starts with `{` or `[` → JSON.
2. Content starts with `<` and contains tags → HTML, or XML when a declaration
   or non-HTML root element is present.
3. CSS: `selector { prop: value; }` shape.
4. Markdown: heading/list/fence/emphasis markers dominate the lines.
5. SQL: leading `SELECT`/`INSERT`/`UPDATE`/`DELETE`/`CREATE` keywords.
6. Python: `def`/`class`/`import` plus colon-terminated blocks.
7. JavaScript vs TypeScript: `interface`/`: type`/`as ` annotations → TypeScript,
   otherwise JavaScript for `function`/`const`/`let`/arrow/`console.`/`import`.
8. Anything else → Plain Text.

Detection runs on document changes with a short debounce (~150 ms) so large
pastes do not re-detect on every keystroke; the character count updates
immediately.

Alternatives considered: a third-party guesser (extra dependency, non-testable
determinism) and CM6 `language-data` auto-detection (not part of CM6; the
`LanguageDescription.matchFilename` helpers need filenames, not content).

### Decision: Status bar language menu reuses the header's plain-DOM pattern

The bottom status bar is a flex row: a language dropdown button on the left and
the character count on the right. The dropdown is built with plain DOM and click/
`Escape` handling like `page-header.js` rather than Bootstrap JS, because pages
already avoid loading `bootstrap.bundle` (and tests enforce that). The button
label shows the active language (`Auto: JavaScript` while detecting, or the
overridden language). Manual selection sets `manualLanguage`; content changes do
not clear it; selecting `Auto` clears it and re-runs detection.

### Decision: Reuse the text editor's session pattern verbatim

`code-editor.js` mirrors `text-editor.js`: `openStore('code-editor', ...)`,
`save({ content })` on user changes, `snapshot()` on leave, URL rewrite via
`replaceState` on first save, before-unload protection for untitled dirty
sessions, and `Clear editor` dispatching a full-document replace while
suppressing the write handler. Restoring writes the stored string directly as
the editor doc; no HTML conversion is involved, so the content is not an
injection vector.

### Decision: Layout fills the remaining viewport

The editor workspace uses the markdown editor's approach: a flex column with
`height: calc(100vh - 176px)` (adjusted for the status bar), and
`.cm-editor { height: 100% }` plus a scrollable `.cm-scroller`, so the gutter and
content scroll together and the footer stays at the bottom.

## Risks / Trade-offs

- **Duplicate `@codemirror/state` instances from CDN resolution** → Pin exact
  versions in the import map and add a startup guard that reports a visible
  warning if the editor fails to construct.
- **CDN outage blocks editing** → Render the page shell and header regardless;
  show a header warning ("The code editor could not be loaded") and keep the
  session readable in storage. No data is lost.
- **Heuristic detection mislabels ambiguous snippets** → The language menu
  always allows a manual override, and `Auto` is clearly labelled.
- **Dynamic language imports add latency on first use** → Only the detected
  language chunk loads; subsequent switches reuse the cached module, and the
  editor stays usable in plain text until the chunk resolves.
- **Character count semantics** (`doc.length`, UTF-16 code units) may differ from
  visual glyph count for emoji → Accepted; documented in the status bar as
  characters, consistent with the markdown editor's count.
- **Auto-detection on large pastes** → Debounced and bounded to a content prefix
  (first ~20 KB) for scoring; highlighting still applies to the full document.

## Migration Plan

No data migration. Deploy is additive: new routes, page, and script do not
change existing kinds or routes. Rollback is removing the two routes and the two
navigation entries; leftover `code-editor` session keys are ignored by older
builds.
