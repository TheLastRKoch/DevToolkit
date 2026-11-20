# Tasks

## 1. Shared margin toggle module

- [x] 1.1 Create `public/static/scripts/editor-margins.js` using the repo's UMD factory pattern, exporting `MARGIN_CLASS` (`editor-margins-enabled`) and `createMarginToggle(workspace)` which returns `{ id: 'toggle-margins', label: 'Toggle margins', run, isEnabled }` or `null` when no workspace element is passed; verify the file loads both as a classic script and via `require`
- [x] 1.2 Add `test/editor-margins.test.js` covering the returned option's id/label, the class being absent initially, `run()` adding the class, `run()` again removing it, and the `null` result without a workspace; verify with `node --test test/editor-margins.test.js`

## 2. Markdown editor page

- [x] 2.1 In `public/markdown-editor.html`, remove the unconditional 200px `@media (min-width: 768px)` margin rule on `#editorWorkspace` and replace it with a rule scoped to `#editorWorkspace.editor-margins-enabled`, and load `/static/scripts/editor-margins.js` before `markdown-editor.js`; verify by reading the rendered HTML
- [x] 2.2 In `public/static/scripts/markdown-editor.js`, create the margin toggle for `#editorWorkspace` and list it as the first option before `Clear editor`; verify the page harness reports options `['Toggle margins', 'Clear editor']`
- [x] 2.3 In `test/helpers/pages.js`, add `editorWorkspace` to the markdown harness ids; in `test/markdown-editor.test.js` replace the 200px media-query assertion with assertions that the class-scoped rule exists and that the workspace has no `editor-margins-enabled` class on load and gains/loses it when the option is selected; update `test/markdown-editor-page.test.js` option list; verify with `node --test test/markdown-editor.test.js test/markdown-editor-page.test.js`

## 3. Text editor page

- [x] 3.1 In `public/text-editor.html`, wrap the existing row/column content in a `#editorWorkspace` container that keeps the current `mt-3` spacing and adds the scoped `@media (min-width: 768px)` 200px margin rule for `.editor-margins-enabled`, and load `/static/scripts/editor-margins.js` before `text-editor.js`; verify the page still mounts Quill on `#txtOutput` with its existing height
- [x] 3.2 In `public/static/scripts/text-editor.js`, create the margin toggle for `#editorWorkspace` and list it before `Clear editor`, tolerating a missing workspace element; verify the harness reports options `['Toggle margins', 'Clear editor']`
- [x] 3.3 In `test/helpers/pages.js`, add `editorWorkspace` to the text editor harness ids; add tests in `test/text-editor-page.test.js` for the option list, default absence of the margin class, toggling it on and off, and content/title remaining unchanged across toggles; verify with `node --test test/text-editor-page.test.js`

## 4. Code editor page

- [x] 4.1 In `public/code-editor.html`, scope the 200px margin rule to `#codeEditorWorkspace.editor-margins-enabled` and load `/static/scripts/editor-margins.js` before `code-editor.js`; verify by reading the rendered HTML
- [x] 4.2 In `public/static/scripts/code-editor.js`, create the margin toggle for `#codeEditorWorkspace` and list it between `Change language format` and `Clear editor`; verify the page harness reports options `['Change language format', 'Toggle margins', 'Clear editor']`
- [x] 4.3 In `test/helpers/pages.js`, add `codeEditorWorkspace` to the code editor harness ids; update `test/code-editor-page.test.js` option-list assertions and add tests for the default margin class state and toggling; verify with `node --test test/code-editor-page.test.js`

## 5. Documentation and integration

- [x] 5.1 Update `docs/pages.md` so the text, markdown, and code editor sections list **Toggle margins** alongside their existing options and describe that margins are off by default; verify the descriptions match the shipped option lists
- [x] 5.2 Update the `PAGES` option lists in `test/page-integration.test.js` for all three editor pages; verify with `node --test test/page-integration.test.js`
- [x] 5.3 Run `npm test` and confirm the full suite passes, including the new margin tests and the unchanged routing/session tests

## Workflow follow-up

- Archive the change with `openspec archive` after implementation is reviewed and the suite is green.
