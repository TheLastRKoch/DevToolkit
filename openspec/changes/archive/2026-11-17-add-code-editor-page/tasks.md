# Tasks

## 1. Routing and page shell

- [x] 1.1 Add `app.get('/code-editor', servePage('code-editor.html'))` and `app.get('/code-editor/:id', serveSessionPage('code-editor.html'))` in `server.js`, and extend `test/routes.test.js` so `/code-editor` and `/code-editor/1` return 200 while `/code-editor/abc` returns 404; verify with `node --test test/routes.test.js`
- [x] 1.2 Create `public/code-editor.html` with the Bootstrap CSS/favicon, navbar, `#pageHeader` mount, the editor mount element, the status bar (`#languageLabel`, `#charCount`), the language modal (`#languageDialog`, `#languageSelect`, `#languageApply`, `#languageCancel`), the pinned CodeMirror import map (official `@codemirror/lang-*` plus the `@codemirror/legacy-modes/` prefix mapping), and the script tags for `browser-session.js`, `page-header.js`, `code-language.js`, `code-editor.js`, and the module `code-editor-surface.js`; verify the page is served by the 1.1 test and contains no inline application logic
- [x] 1.3 Add the `Code Editor` item linking to `/code-editor` in the `public/index.html` New dropdown and register `code-editor` in `KINDS` and `PAGE_BY_KIND` in `public/static/scripts/gallery.js`; verify `node --test test/routes.test.js test/gallery.test.js` covers the home link and kind filter

## 2. Language detection

- [x] 2.1 Implement `public/static/scripts/code-language.js` as a UMD module exposing `detectLanguage(text)` and the supported-language catalog (Plain Text plus the 20 languages: JavaScript, TypeScript, Python, Java, C#, C++, C, Go, Rust, PHP, Ruby, SQL, Kotlin, Swift, Shell, HTML, CSS, JSON, XML, Markdown) using the ordered heuristics in `design.md`; verify with `test/code-language.test.js` detecting each of the 20 languages plus the Plain Text fallback
- [x] 2.2 Bound detection cost by scoring only the first ~20 KB of content and returning stable ids; verify the test asserts large inputs still detect, C-family snippets map to C, C++, C#, Java, and Kotlin in the intended order, and an ambiguous input falls back to `plaintext`

## 3. CodeMirror surface

- [x] 3.1 Implement `public/static/scripts/code-editor-surface.js` as an ES module that imports `codemirror` for `basicSetup` and creates the editor on the mount element with line numbers, history, bracket matching, search, and an empty placeholder; verify in a browser that the page renders line numbers and accepts typing
- [x] 3.2 Implement the adapter returned by `create()` (`getValue`, `setValue`, `focus`, `setLanguage`, `destroy`) using a `Compartment` for language and a doc-change listener; verify switching the language does not reset cursor or undo history in the browser
- [x] 3.3 Lazily `import()` the official `@codemirror/lang-*` packages and the `@codemirror/legacy-modes` stream modes for C, C#, Kotlin, Ruby, Shell, and Swift, cache them, and fall back to plain text when a chunk fails; verify in the browser that each language family highlights and that a CDN failure leaves the page usable with a header warning
- [x] 3.4 Register `window.DevToolkitCodeEditorSurface` and call `window.DevToolkitCodeEditor.start()` after registration so load order works with the classic page script; verify the editor mounts once on page load in the browser
- [x] 3.5 Bind `Tab`/`Shift+Tab` for indentation in `code-editor-surface.js`: add `Prec.highest(keymap.of([{ key: 'Tab', run: insertTab, shift: indentLess }]))` using `insertTab`/`indentLess` from `@codemirror/commands`, `keymap` from `@codemirror/view`, and `Prec` from `@codemirror/state`, and set `indentUnit.of('\t')`; verify in the browser that Tab inserts a tab at the cursor and indents a multi-line selection without leaving the editor, that Shift+Tab removes one leading tab, and that Tab outside the editor still moves focus

## 4. Page runtime, session, and status bar

- [x] 4.1 Implement `public/static/scripts/code-editor.js` mirroring `text-editor.js`: open the `code-editor` store, restore the stored title and content, persist user edits, snapshot on `visibilitychange`/`pagehide`, rewrite the URL to `/code-editor/<id>` on first save, and protect untitled dirty sessions on `beforeunload`; verify with `openCodeEditorPage` harness tests for store/restore/URL/protection
- [x] 4.2 Mount the shared header with exactly two options, `Change language format` and `Clear editor`, and implement `Clear editor` as a full-document replace that persists empty content while keeping the title and not marking the session dirty; verify the harness test asserts the two option labels, the emptied doc, the versioned empty content, and the retained title
- [x] 4.3 Implement the non-interactive status-bar language label (`Auto: <Language>` while detecting, `<Language>` for a manual choice) and the `Change language format` modal: plain-DOM dialog with a preselected select of `Auto`, `Plain Text`, and the 20 languages, Apply/Cancel/Escape/backdrop handling, `manualLanguage` state that survives content edits, and `Auto` resuming detection; wire debounced detection on doc changes to `setLanguage`; verify harness tests for label text, modal open, apply, cancel, edit-keeps-override, and Auto reset
- [x] 4.4 Show the character count from `doc.length` in the status bar and update it on every doc change; verify the harness test types and pastes content and asserts the count text
- [x] 4.5 Extend `test/helpers/pages.js` with an `openCodeEditorPage` harness that stubs `DevToolkitCodeEditorSurface` (recording `create`, `setValue`, `setLanguage`) and the modal elements, and add `test/code-editor-page.test.js` covering the two header options, exact-content preservation, isolation from other kinds, clear behavior, unsaved-change protection, label text, and modal apply/cancel; verify with `node --test test/code-editor-page.test.js`
- [x] 4.6 Document the Code Editor page, its routes, the non-interactive language label, the `Change language format` modal with its 20 languages, and the character count in `docs/pages.md`, and add `code-editor` to the documented gallery kind list; verify the documented routes and option labels match `server.js` and the page script
- [x] 4.7 Document that `Tab` inserts a tab or indents the selected lines and `Shift+Tab` removes one tab inside the editor, and that neither moves focus out of the surface, in the Code Editor section of `docs/pages.md`; verify the documented behavior matches the keymap in `code-editor-surface.js`

## 5. Integration verification

- [x] 5.1 Run `npm test` and verify the full suite passes with no regressions in the existing page, gallery, or route tests
- [ ] 5.2 Start `node server.js`, open `/code-editor`, paste mixed code, confirm auto-detection, the language label, and the character count, then open `Change language format`, choose several languages from the dropdown, confirm Apply updates highlighting and Cancel leaves it unchanged, and verify a titled reload restores content and the URL is `/code-editor/<id>`; verify the session appears in the home page gallery and that `/code-editor/abc` returns 404

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived result.
