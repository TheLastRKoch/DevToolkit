# Tasks

## 1. Fix Bug 1 – Equal-height panes (HTML/CSS)

- [x] 1.1 In `public/markdown-editor.html`, add a bottom padding or a visually-matching spacer to `#previewPane` equal in height to `#editorStatusBar` (28 px / `min-height: 28px`) so both panes' content areas are the same height. Verify by loading `/markdown-editor` and confirming `#mdInput` and `#mdPreview` are visually the same height in a browser or via computed-style inspection.
- [x] 1.2 Confirm no existing CSS rules in `markdown-editor.html` conflict with the added spacer/padding (run a visual spot-check in both light and dark themes if applicable). Verify the character-count status bar is still visible and correctly positioned at the bottom of the raw pane.

## 2. Fix Bug 2 – Expand/collapse toggle (JS)

- [x] 2.1 In `public/static/scripts/markdown-editor.js`, update `applyPaneState()`: replace all `element.style.display = 'none'` calls with `element.classList.add('d-none')` and all `element.style.display = ''` restore calls with `element.classList.remove('d-none')`. Verify that the `d-none` Bootstrap class (which carries `!important`) is used for hiding and removing it is used for showing.
- [x] 2.2 Verify expand editor: click `[]` in the raw pane toolbar and confirm `#previewPane` is no longer visible and `#rawPane` occupies full width. Verify restore: click `[]` again and confirm both panes reappear side by side with the divider visible.
- [x] 2.3 Verify expand preview: click `[]` in the preview pane toolbar and confirm `#rawPane` is no longer visible and `#previewPane` occupies full width. Verify restore: click `[]` again and confirm both panes reappear side by side with the divider visible.

## 3. Regression check

- [x] 3.1 Confirm that live markdown rendering, character count, and synchronized scrolling still function correctly after both fixes (type text, scroll, verify output matches).
- [x] 3.2 Confirm no JavaScript console errors are thrown during expand/collapse cycles or on initial page load.

## 4. Half-screen split and responsive 200px horizontal margins

- [x] 4.1 In `public/markdown-editor.html`, update `#editorWorkspace` styles so that 200px left and right margins apply only in tablet and desktop mode via `@media (min-width: 768px)`, leaving mobile mode (< 768px) without the 200px margins.
- [x] 4.2 In `public/markdown-editor.html`, configure `#rawPane` and `#previewPane` with `flex: 1 1 50%` / `width: 50%` so they share equal halves of the workspace in split view. Verify both panes occupy identical 50% widths.
- [x] 4.3 Update `test/markdown-editor.test.js` to assert the responsive 200px margins at `@media (min-width: 768px)` and verify all automated tests pass.

## Workflow follow-up

- Archive the change once all tasks are verified and any required review is complete.
