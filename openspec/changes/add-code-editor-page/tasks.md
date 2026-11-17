# Tasks

## 1. Routing and page shell

- [x] 1.1 Add `app.get('/code-editor', servePage('code-editor.html'))` and `app.get('/code-editor/:id', serveSessionPage('code-editor.html'))` in `server.js`, and extend `test/routes.test.js` so `/code-editor` and `/code-editor/1` return 200 while `/code-editor/abc` returns 404; verify with `node --test test/routes.test.js`
- [x] 1.2 Create `public/code-editor.html` with the Bootstrap CSS/favicon, navbar, `#pageHeader` mount, the editor mount element, the status bar (`#languageButton`, `#languageMenu`, `#charCount`), the pinned CodeMirror import map, and the script tags for `browser-session.js`, `page-header.js`, `code-language.js`, `code-editor.js`, and the module `code-editor-surface.js`; verify the page is served by the 1.1 test and contains no inline application logic
- [x] 1.3 Add the `Code Editor` item linking to `/code-editor` in the `public/index.html` New dropdown and register `code-editor` in `KINDS` and `PAGE_BY_KIND` in `public/static/scripts/gallery.js`; verify `node --test test/routes.test.js test/gallery.test.js` covers the home link and kind filter

## 2. Language detection

- [x] 2.1 Implement `public/static/scripts/code-language.js` as a UMD module exposing `detectLanguage(text)` and the supported-language catalog (Plain Text, JavaScript, TypeScript, JSON, HTML, CSS, Markdown, Python, SQL, XML) using the ordered heuristics in `design.md`; verify with a new `test/code-language.test.js` covering each language plus the Plain Text fallback
- [x] 2.2 Bound detection cost by scoring only the first ~20 KB of content and returning stable ids; verify the test asserts a large input still detects and an ambiguous input falls back to `plaintext`

## 3. CodeMirror surface

- [x] 3.1 Implement `public/static/scripts/code-editor-surface.js` as an ES module that imports `codemirror` for `basicSetup` and creates the editor on the mount element with line numbers, history, bracket matching, search, and an empty placeholder; verify in a browser that the page renders line numbers and accepts typing
- [x] 3.2 Implement the adapter returned by `create()` (`getValue`, `setValue`, `focus`, `setLanguage`, `destroy`) using a `Compartment` for language and a doc-change listener; verify switching the language does not reset cursor or undo history in the browser
- [x] 3.3 Lazily `import()` the `@codemirror/lang-*` packages for the supported languages, cache them, and fall back to plain text when a chunk fails; verify in the browser that JSON, JavaScript, HTML, CSS, and Markdown content each highlight and that a CDN failure leaves the page usable with a header warning
- [x] 3.4 Register `window.DevToolkitCodeEditorSurface` and call `window.DevToolkitCodeEditor.start()` after registration so load order works with the classic page script; verify the editor mounts once on page load in the browser

## 4. Page runtime, session, and status bar

- [x] 4.1 Implement `public/static/scripts/code-editor.js` mirroring `text-editor.js`: open the `code-editor` store, restore the stored title and content, persist user edits, snapshot on `visibilitychange`/`pagehide`, rewrite the URL to `/code-editor/<id>` on first save, and protect untitled dirty sessions on `beforeunload`; verify with `openCodeEditorPage` harness tests for store/restore/URL/protection
- [x] 4.2 Mount the shared header with the single `Clear editor` option and implement it as a full-document replace that persists empty content while keeping the title and not marking the session dirty; verify the harness test asserts the emptied doc, the versioned empty content, and the retained title
- [x] 4.3 Implement the status bar language button and menu (plain DOM, `Escape`/outside-click close) with `Auto` plus the supported languages, `manualLanguage` override state that survives content edits, and `Auto` resuming detection; wire debounced detection on doc changes to `setLanguage`; verify harness tests for detection display, override, edit-keeps-override, and Auto reset
- [x] 4.4 Show the character count from `doc.length` in the status bar and update it on every doc change; verify the harness test types and pastes content and asserts the count text
- [x] 4.5 Extend `test/helpers/pages.js` with an `openCodeEditorPage` harness that stubs `DevToolkitCodeEditorSurface` (recording `create`, `setValue`, `setLanguage`) and add `test/code-editor-page.test.js` covering header options, exact-content preservation, isolation from other kinds, clear behavior, and unsaved-change protection; verify with `node --test test/code-editor-page.test.js`
- [x] 4.6 Document the Code Editor page, its routes, status bar, and language override in `docs/pages.md`, and add `code-editor` to the documented gallery kind list; verify the documented routes match `server.js`

## 5. Integration verification

- [x] 5.1 Run `npm test` and verify the full suite passes with no regressions in the existing page, gallery, or route tests
- [x] 5.2 Start `node server.js`, open `/code-editor`, paste mixed code, confirm highlighting and the language/character status bar, then verify a titled reload restores content and the URL is `/code-editor/<id>`; verify the session appears in the home page gallery and that `/code-editor/abc` returns 404

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived result.
