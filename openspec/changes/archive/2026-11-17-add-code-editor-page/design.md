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
- Pages avoid Bootstrap's JavaScript bundle; interactive widgets are built with
  plain DOM and Bootstrap CSS only (tests enforce that).
- The session store persists a plain string `content`, so no store changes are
  needed.

## Goals / Non-Goals

**Goals:**

- Mount CodeMirror 6 with `basicSetup` in a page that reuses the shared header
  and session store unchanged.
- Keep the language detector and most page logic unit-testable in Node without a
  browser or network access.
- Keep the code surface a plain-text editor: stored content round-trips exactly.
- Let `Tab` and `Shift+Tab` indent and outdent inside the editor, as in VSCode,
  without moving focus out of the surface.
- Expose the language override through the shared Options dropdown and a modal,
  leaving the status-bar language label non-interactive.

**Non-Goals:**

- No server-side persistence, no new API endpoints, no session schema changes.
- No build pipeline, bundler, or npm runtime dependency for the browser.
- No language server features (linting, diagnostics, completion beyond the
  built-in basic-setup completion), no multi-file or file-system support.
- No persistence of the manually selected language; it is a view-only override
  that resets to `Auto` on reload. There are no per-language editor settings
  (indentation, keymaps, or linting); one indentation unit and one Tab binding
  apply to every language.

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

### Decision: Heuristic auto-detection over the 20 supported languages

`detectLanguage` scores the content and returns a stable language id from:
Plain Text (fallback), JavaScript, TypeScript, Python, Java, C#, C++, C, Go,
Rust, PHP, Ruby, SQL, Kotlin, Swift, Shell, HTML, CSS, JSON, XML, Markdown.

Ordering and signals (first match wins):

1. PHP: starts with `<?php`.
2. JSON: `JSON.parse` succeeds and the trimmed content starts with `{` or `[`.
3. HTML/XML: starts with `<` and contains tags; XML for an XML declaration or a
   non-HTML root element, HTML otherwise.
4. CSS: `selector { prop: value; }` shape with known properties.
5. Markdown: heading/list/fence/emphasis markers dominate the lines.
6. Shell: a `sh`/`bash`/`zsh` shebang, or `if ... then`, `fi`, `done`, and
   `$VAR`/`$(...)` structure; a `node` shebang is not Shell.
7. SQL: leading `SELECT`/`INSERT`/`UPDATE`/`DELETE`/`CREATE` keywords.
8. Python: `def`/`class`/`import` plus colon-terminated blocks.
9. Rust: `fn main`, `let mut`, `println!`, `use std::`, `impl`.
10. Go: `package` with `func`, `fmt.`, `:=`.
11. Ruby: `def ... end`, `require`, `puts`, `do |`, `attr_`.
12. Kotlin: `fun `, `val`/`var`, `println(`, `data class`, `?:`.
13. Swift: `import Foundation`/`UIKit`, `func ... ->`, `guard let`, `print(`.
14. C#: `using System`, `Console.`, `namespace`, `{ get; set; }`.
15. Java: `import java.`, `System.out`, `public static void main`, `@Override`.
16. C++: `#include <iostream>`, `std::`, `cout <<`, `template<`.
17. C: `#include <stdio.h>`, `printf(`, `int main(`.
18. JavaScript vs TypeScript: `interface`/`: type`/`as ` annotations →
    TypeScript, otherwise JavaScript for `function`/`const`/`let`/arrow/
    `console.`/`import`.
19. Anything else → Plain Text.

The C-family checks are ordered C# → Java → C++ → C and each requires its own
library or header marker, so `#include <stdio.h>` is not read as C++ and `using
System` is not read as Java.

Detection runs on document changes with a short debounce (~150 ms) so large
pastes do not re-detect on every keystroke; the character count updates
immediately.

Alternatives considered: a third-party guesser (extra dependency, non-testable
determinism) and CM6 `language-data` auto-detection (not part of CM6; the
`LanguageDescription.matchFilename` helpers need filenames, not content).

### Decision: Tab indents inside the editor instead of moving focus

`basicSetup` does not bind `Tab`, so the browser's default focus traversal leaves
the editor on every Tab press. The surface adds a high-precedence keymap,
`Prec.highest(keymap.of([{ key: 'Tab', run: insertTab, shift: indentLess }]))`,
importing `insertTab` and `indentLess` from `@codemirror/commands` (already
pinned in the import map), `keymap` from `@codemirror/view`, and `Prec` from
`@codemirror/state`.

The editor also sets `indentUnit.of('\t')`. With that unit, `insertTab` inserts a
literal tab at a cursor and delegates to `indentMore` for a selection, so both
paths indent by exactly one tab. `indentLess` removes one tab stop
(`getIndentUnit` uses the tab width when the unit is a tab), so `Shift+Tab`
deletes a leading tab or the equivalent number of leading spaces and writes any
remainder back as spaces. Both commands return `true`, which stops the browser
from moving focus. The binding applies only while the editor is focused, so the
title textbox and Options dropdown keep normal Tab navigation.

Alternatives considered:

- **`indentWithTab`** — binds `Tab` to `indentMore`, which shifts whole lines
  even with a bare cursor and never inserts at the cursor; not VSCode's
  behaviour.
- **A custom Tab handler** — duplicates `insertTab`/`indentLess` and drifts from
  CodeMirror's indentation handling.
- **Leaving the browser default** — `Tab` leaves the editor and cannot be used
  for indentation.

### Decision: Official language packages, with legacy stream modes for the rest

Fourteen language modes come from official `@codemirror/lang-*` packages:
JavaScript/TypeScript, JSON, HTML, CSS, Markdown, Python, SQL, XML, Java, C++,
PHP, Rust, and Go.

Six modes have no official package, so the surface loads
`@codemirror/legacy-modes@6.5.5` subpaths — `mode/clike` (C, C#, Kotlin),
`mode/ruby`, `mode/shell`, `mode/swift` — and wraps each mode with
`StreamLanguage.define` from the already-mapped `@codemirror/language`.

The import map adds exact versions for the five additional official packages and
a trailing-slash mapping for `@codemirror/legacy-modes/`. Legacy mode modules are
pure mode definitions with no imports of their own, so the prefix mapping cannot
create a second `@codemirror/language` instance.

Alternative considered: loading only official languages and leaving the rest on
plain text — rejected because the requested dropdown offers the 20 common
languages.

### Decision: Non-interactive language label plus an Options modal

The bottom status bar is a flex row: a text label on the left and the character
count on the right. The label reads `Auto: <Language>` while auto-detecting and
`<Language>` after a manual choice; it is not a control. `text-truncate` keeps a
long label from pushing the character count off narrow screens.

The override lives behind the header's `Change language format` option, which
opens `#languageDialog` — a plain-DOM dialog (`role="dialog"`,
`aria-modal="true"`, hidden by default) containing `<select id="languageSelect">`,
`#languageApply`, and `#languageCancel`. The select lists `Auto`, `Plain Text`,
then the 20 languages alphabetically, preselected to the current mode. Opening
focuses the select. Cancel, `Escape`, or a backdrop click closes without changing
anything; Apply maps `Auto` to automatic detection, `Plain Text` to plain text,
and any other value to that language, applies the highlighting, and closes.
Reopening recomputes the preselection.

Bootstrap's JavaScript bundle stays unloaded (tests enforce that), so the dialog
is plain DOM with Bootstrap CSS classes for styling and its own focus and
`Escape` handling. Alternative considered: a `<select>` in the status bar —
rejected because the user asked for a label there and a modal override.

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
- **Heuristic detection mislabels ambiguous snippets, especially in the
  C-family** → Ordered markers (C# → Java → C++ → C) plus the `Change language
  format` modal always allow a manual override, and `Auto` is clearly labelled.
- **Legacy stream modes highlight less precisely than Lezer grammars** →
  Accepted for C, C#, Kotlin, Ruby, Shell, and Swift; they only style tokens and
  do not change editing behavior. Official packages are preferred where they
  exist.
- **The 20-language surface grows the page's module graph** → Only the detected
  or selected language chunk is imported, and loaded chunks are cached.
- **The modal must work without Bootstrap JS** → Plain-DOM dialog with
  focus-on-open, Escape/backdrop cancel, and harness tests for open, apply, and
  cancel.
- **A long language label crowds the status bar on narrow screens** → Truncate
  the label and keep the character count right-aligned.
- **Dynamic language imports add latency on first use** → Only the detected
  language chunk loads; subsequent switches reuse the cached module, and the
  editor stays usable in plain text until the chunk resolves.
- **Character count semantics** (`doc.length`, UTF-16 code units) may differ from
  visual glyph count for emoji → Accepted; documented in the status bar as
  characters, consistent with the markdown editor's count.
- **Auto-detection on large pastes** → Debounced and bounded to a content prefix
  (first ~20 KB) for scoring; highlighting still applies to the full document.
- **Capturing `Tab` removes keyboard-only focus traversal out of the editor** →
  The binding is scoped to the focused editor, so the rest of the page keeps
  normal Tab behaviour and the header stays reachable with a pointer or by
  tabbing in from the title textbox. Matching VSCode's editing behaviour is the
  explicit requirement.

## Migration Plan

No data migration. Deploy is additive: new routes, page, and script do not
change existing kinds or routes. Rollback is removing the two routes and the two
navigation entries; leftover `code-editor` session keys are ignored by older
builds.
