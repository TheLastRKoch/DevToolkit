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
- Reuse the shared page header: the page title textbox stays identical to the
  Text Editor, and the Options dropdown offers `Change language format` and
  `Clear editor`.
- Replace the Quill rich-text surface and its format bar with a CodeMirror 6
  editor built from the basic setup example (`basicSetup`), giving line numbers,
  undo/redo history, bracket matching, active-line highlighting, and search.
- Keep the keyboard inside the code surface like an editor: `Tab` inserts a tab
  at the cursor or indents the selected lines, and `Shift+Tab` removes one tab,
  with neither shortcut moving focus out of the editor.
- Load CodeMirror 6 as ES modules from a CDN, since the project has no bundler.
- Detect the code language automatically from the editor content and apply the
  matching syntax highlighting across the 20 most common languages:
  JavaScript, TypeScript, Python, Java, C#, C++, C, Go, Rust, PHP, Ruby, SQL,
  Kotlin, Swift, Shell, HTML, CSS, JSON, XML, and Markdown.
- Add a status bar under the editor: a non-interactive language label at the
  bottom-left (`Auto: JavaScript` while detecting, or the chosen language) plus a
  live character count.
- Add a `Change language format` option that opens a modal with a language
  dropdown offering `Auto`, `Plain Text`, and the 20 supported languages, so the
  user can override detection or resume it.
- Persist content through the existing browser session store under the new
  `code-editor` kind, with the same conditional-persistence rules (only titled
  sessions are stored, three versions, URL update, unsaved-change protection).
- Add a **Code Editor** entry to the home page New dropdown and register the
  `code-editor` kind in the session gallery.

## Capabilities

### New Capabilities

- `code-editor-page`: serving the code editor routes, the shared header plus
  CodeMirror editing surface, automatic detection across 20 languages with a
  modal override, the language-label/character-count status bar, and
  browser-session persistence and isolation for the `code-editor` kind.

### Modified Capabilities

- `session-gallery`: the New dropdown must also offer `/code-editor`, and the
  gallery kind filters must include the `code-editor` kind.

## Impact

- `server.js`: two new page routes (`/code-editor`, `/code-editor/:id`).
- `public/code-editor.html`: new page shell loading the shared header, session
  store, status-bar label, language modal, the pinned CodeMirror import map, and
  the code editor scripts.
- `public/static/scripts/code-editor.js`: new page script wiring CodeMirror 6,
  language detection, the status-bar label, the language modal, and the session
  store.
- `public/static/scripts/code-editor-surface.js`: new CodeMirror 6 surface
  module with the editing extensions, lazy language loading, and the
  `Tab`/`Shift+Tab` indentation keymap.
- `public/index.html`: New dropdown entry for Code Editor.
- `public/static/scripts/gallery.js`: `KINDS`, `PAGE_BY_KIND`, and label mapping
  for `code-editor`.
- `test/`: route, page-harness, and gallery assertions for the new kind.
- `docs/pages.md`: the Code Editor section, including the `Tab`/`Shift+Tab`
  indent and outdent behavior.
- New runtime dependency on CodeMirror 6 packages (`codemirror`,
  `@codemirror/lang-*`, and `@codemirror/legacy-modes` for languages without an
  official package) loaded from a CDN; no npm dependency is added to the
  server.
