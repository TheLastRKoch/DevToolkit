# Tasks

## 1. Add the shared text wrap module

- [ ] 1.1 Create `public/static/scripts/editor-text-wrap.js` as a UMD-style classic script exposing `createTextWrapToggle({ workspace, apply })` with `run`, `toggle`, and `isEnabled`, a keydown handler on `document` matching `event.code === 'KeyZ'` with `altKey` and without `ctrlKey`/`metaKey`, and `preventDefault()` on match; verify `node -e "require('./public/static/scripts/editor-text-wrap.js')"` prints the exported API.
- [ ] 1.2 Add `test/editor-text-wrap.test.js` covering: wrapping starts disabled, the first toggle enables and the second disables, a `KeyZ` event without `Alt`/`Option` is ignored, an `Alt+KeyZ` event toggles and is default-prevented, `Alt+Shift+KeyZ` and `Ctrl+Alt+KeyZ` follow the chosen modifier rule, an `Alt` event with `key: 'Ω'` still toggles (macOS `Option+Z`), and `apply` receives the new state each time; verify with `npm test`.

## 2. Wire the code editor

- [ ] 2.1 Add a wrapping `Compartment` and a `setLineWrapping(enabled)` method to `public/static/scripts/code-editor-surface.js`, applying `[]` or `EditorView.lineWrapping`, and verify `test/code-editor-page.test.js` still passes with the surface stub unchanged.
- [ ] 2.2 Wire `createTextWrapToggle` into `public/static/scripts/code-editor.js` with an `apply` callback that calls `surface.setLineWrapping`, load `editor-text-wrap.js` from `public/code-editor.html`, and verify `test/code-editor-page.test.js` passes with new assertions that the page starts unwrapped and that dispatching `Alt+KeyZ` requests wrapping without changing the character count or content.

## 3. Wire the raw text editor

- [ ] 3.1 Add the `editor-text-wrap-disabled` styling in `public/raw-text-editor.html` so Quill's `.ql-editor` uses `white-space: pre` with horizontal overflow while the class is present, load `editor-text-wrap.js`, and verify `test/raw-text-editor-page.test.js` passes with an assertion that a long line is unwrapped on load.
- [ ] 3.2 Wire `createTextWrapToggle` into `public/static/scripts/raw-text-editor.js` using the `#editorWorkspace` element, and verify `test/raw-text-editor-page.test.js` passes with assertions that the shortcut toggles the workspace class, the Options list is unchanged, and the stored session content and title are untouched.
- [ ] 3.3 Document the shortcut and default-off behavior in `docs/pages.md` and verify the documented key names match the implemented handler.

## 4. Verify the integrated behavior

- [ ] 4.1 Run `npm test` and confirm the full suite passes for both editor pages, the shared module, and the existing route and margin tests.
- [ ] 4.2 Start the server (`node server.js`), open `/code-editor` and `/raw-text-editor` with a long line, and confirm wrapping is off on load, `Alt+Z` toggles it both ways, no `z` is inserted, and reloading restores the disabled state; then run `openspec validate add-editor-text-wrap-toggle --strict` and confirm it passes.

## Workflow follow-up

- Archive the change after review is complete.
