# Proposal

## Why

DevToolkit's Text Editor is a rich-text surface (Quill) meant for prose, so it
mangles whitespace and applies formatting when a user simply wants to paste or
write source code. Developers need a dedicated code surface with line numbers,
syntax highlighting, and character counting that still uses the existing
browser-persisted session model, so code snippets survive reloads exactly as
typed.

## What Changes

- Add a new **Code Editor** page served at `/code-editor` and
  `/code-editor/<id>`.
- Reuse the shared page header unchanged: the page title textbox and the Options
  dropdown (with a `Clear editor` action) stay identical to the Text Editor.
- Replace the Quill rich-text surface and its format bar with a CodeMirror 6
  editor built from the basic setup example (`basicSetup`), giving line numbers,
  undo/redo history, bracket matching, active-line highlighting, and search.
- Load CodeMirror 6 as ES modules from a CDN, since the project has no bundler.
- Detect the code language automatically from the editor content and apply the
  matching syntax highlighting.
- Add a status bar under the editor: a language control at the bottom-left that
  shows the detected language and lets the user override it, plus a live
  character count.
- Persist content through the existing browser session store under the new
  `code-editor` kind, with the same conditional-persistence rules (only titled
  sessions are stored, three versions, URL update, unsaved-change protection).
- Add a **Code Editor** entry to the home page New dropdown and register the
  `code-editor` kind in the session gallery.

## Capabilities

### New Capabilities

- `code-editor-page`: serving the code editor routes, the shared header plus
  CodeMirror editing surface, automatic language detection and highlighting,
  the language/character-count status bar, and browser-session persistence and
  isolation for the `code-editor` kind.

### Modified Capabilities

- `session-gallery`: the New dropdown must also offer `/code-editor`, and the
  gallery kind filters must include the `code-editor` kind.

## Impact

- `server.js`: two new page routes (`/code-editor`, `/code-editor/:id`).
- `public/code-editor.html`: new page shell loading the shared header, session
  store, and the code editor script.
- `public/static/scripts/code-editor.js`: new page script wiring CodeMirror 6,
  language detection, the status bar, and the session store.
- `public/index.html`: New dropdown entry for Code Editor.
- `public/static/scripts/gallery.js`: `KINDS`, `PAGE_BY_KIND`, and label mapping
  for `code-editor`.
- `test/`: route, page-harness, and gallery assertions for the new kind.
- New runtime dependency on CodeMirror 6 packages (`codemirror`,
  `@codemirror/lang-*`) loaded from a CDN at page load; no npm dependency is
  added to the server.
