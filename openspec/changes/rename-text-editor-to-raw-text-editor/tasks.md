# Tasks

## 1. Rename the endpoint and page files

- [x] 1.1 Rename `public/text-editor.html` to `public/raw-text-editor.html` and `public/static/scripts/text-editor.js` to `public/static/scripts/raw-text-editor.js`; update the HTML script tag, the page `<title>`, and the script header comment; verify `grep -rn "text-editor" public/` returns no page/script references
- [x] 1.2 Replace the `/text-editor` and `/text-editor/:id` handlers in `server.js` with `/raw-text-editor` and `/raw-text-editor/:id` serving `raw-text-editor.html`, and repoint `/editor` and `/editor/:id` redirects to `/raw-text-editor`; verify `node --test test/routes.test.js` passes after updating route expectations
- [x] 1.3 Update `test/routes.test.js` and `test/page-integration.test.js` for the new paths, the `Raw Text Editor` label, the `/text-editor` 404 cases, and the `/editor` redirect target; verify both files pass
- [x] 1.4 Update `docs/pages.md` (legacy redirects, the text editor section heading and routes, and the gallery kind list) to describe the raw text editor; verify no `/text-editor` reference remains in `docs/pages.md`

## 2. Rename the browser session kind

- [x] 2.1 Change the page script's `KIND` constant to `raw-text-editor`; verify `node --test test/text-editor-page.test.js` asserts the new kind after the test is renamed and updated
- [x] 2.2 Rename `test/text-editor-page.test.js` to `test/raw-text-editor-page.test.js` and update `test/helpers/pages.js` (`openTextEditorPage` → `openRawTextEditorPage`, seeded kind, harness kind) plus every test that imports the old helper name; verify the renamed page test file passes
- [x] 2.3 Update `public/index.html` (New dropdown entry → `/raw-text-editor` and `Raw Text Editor`) and `public/static/scripts/gallery.js` (`KINDS` and `PAGE_BY_KIND`); verify the gallery and route tests assert the new kind and link

## 3. Normalize pasted content

- [x] 3.1 Extend `createQuillStub` in `test/helpers/pages.js` with `addMatcher` support (exposing registered matchers to tests) and a `root` object with `contains()`; add a `paste(...)` harness helper that dispatches the document `paste` event and then invokes the recorded matchers; verify existing page tests still pass
- [x] 3.2 Implement the paste normalization in `raw-text-editor.js`: a document-level capture `paste` listener that scopes the flag to editor targets (cleared with `setTimeout`), plus a clipboard element matcher that deletes `background` and sets `color: '#000000'` on string inserts; verify new tests fail without it and pass with it
- [x] 3.3 Add page tests covering: a pasted op with `background` loses it, a pasted op with a non-black `color` becomes black, content outside the paste keeps its attributes, and a restore conversion leaves its delta untouched; verify `node --test test/raw-text-editor-page.test.js` passes
- [x] 3.4 Verify the persisted version stores the cleaned content after a paste; add or extend the page test that reads the stored session version and assert no `background` remains

## 4. Integration verification

- [x] 4.1 Run the full suite with `npm test`; verify all tests pass
- [x] 4.2 Manually open `/raw-text-editor` in a browser, paste styled content from another page, and confirm in devtools that the pasted text has no background and a black color, while previously typed content is unchanged

## Workflow follow-up

- Archive the change after review and integration checks are satisfied.
- Verify the archived result.
