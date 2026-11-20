# Tasks

## 1. Render the preview in the page flow

- [x] 1.1 In `public/markdown-editor.html`, remove the fixed workspace height and card chrome: drop `height: calc(100vh - 176px)` from `#editorWorkspace` and the `border rounded shadow-sm overflow-hidden bg-white` utilities from its element while keeping `mt-3 mb-3` separation and the `editor-margins-enabled` rule; verify by confirming the page markup and `@media` margin rule remain intact in the served HTML
- [x] 1.2 In `public/markdown-editor.html`, stop the preview from owning a scroll region: remove `overflow-y: auto` from `#mdPreview`, let the preview size to its content while the raw pane keeps a usable bounded height, and keep the 768 px side-by-side width split and below-768 px stacked order; verify by reading the rendered CSS and confirming no fixed preview height or inner scrollbar remains
- [x] 1.3 In `test/markdown-editor.test.js`, replace the fixed 50%-height layout assertions with assertions that `#editorWorkspace` has no fixed viewport height, `#mdPreview` has no `overflow` scroll rule, the 768 px 50%-width split and stacked mobile order still exist, and the 200px `editor-margins-enabled` rule is unchanged; verify with `node --test test/markdown-editor.test.js`

## 2. Remove scroll synchronization from the controller

- [x] 2.1 In `public/static/scripts/markdown-editor.js`, delete `isSyncing`, `syncScroll`, and the two `scroll` listeners on `#mdInput` and `#mdPreview`, leaving `updateContent`, the pane expand/restore state machine, sessions, margins, and the Clear editor option untouched; verify no `syncScroll` or `scroll` listener references remain in the script
- [x] 2.2 In `test/markdown-editor.test.js`, keep/adjust the pane expand-restore assertions and add coverage that typing still updates `#mdPreview` and the `Clear editor` option still empties it after the controller cleanup; verify with `node --test test/markdown-editor.test.js`

## 3. Verify page-level behavior

- [x] 3.1 In `test/markdown-editor-page.test.js`, confirm the live-render, clear, restore, and session tests still pass against the new layout and add an assertion that the preview element is not wrapped in the removed card container; verify with `node --test test/markdown-editor-page.test.js`
- [x] 3.2 In `test/helpers/pages.js`, update the markdown harness ids if the layout change removes or renames any element, and verify the markdown harness still builds every page under test

## 4. Documentation

- [x] 4.1 Update `docs/pages.md` markdown editor section to describe the rendered preview flowing in the page (no boxed or separately scrolling preview panel) and drop any mention of scroll synchronization; verify the description matches the shipped layout and option list

## 5. Integration verification

- [x] 5.1 Run `npm test` and confirm the full suite passes, including the markdown layout, page behavior, margins, and routing tests
- [x] 5.2 Open `/markdown-editor` and confirm a long document renders in full with page-level scrolling, the split view works on wide and narrow viewports, and the expand/restore and margins toggles still behave as before
