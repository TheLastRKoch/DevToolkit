# Tasks

## 1. Footer Updates Across Pages

- [x] 1.1 Update footer markup in `public/index.html`, `public/markdown-editor.html`, `public/template.html`, and `public/text-editor.html` to display `DevToolKit fork me on <a href="https://github.com/TheLastRKoch/devtoolkit" target="_blank" rel="noopener noreferrer">github</a>` instead of copyright text, and verify markup in all 4 HTML files
- [x] 1.2 Add automated tests asserting that all served pages (`/`, `/markdown-editor`, `/template`, `/text-editor`) render the updated footer with the GitHub repository link and no longer contain "All rights reserved.", and verify with `npm test`

## 2. Home Page Sticky Footer Layout

- [x] 2.1 Update `public/index.html` so `<body>` has `class="d-flex flex-column min-vh-100"` and `<main class="container pb-5">` includes `flex-grow-1`, ensuring the footer anchors to the bottom of the viewport even with sparse content
- [x] 2.2 Add automated tests in `test/gallery.test.js` (or page tests) asserting that `public/index.html` has `d-flex flex-column min-vh-100` on `<body>` and `flex-grow-1` on `<main>`, and verify with `npm test`

## 3. Markdown Editor Workspace Separation

- [x] 3.1 Update `public/markdown-editor.html` to add `mt-3` to `#editorWorkspace` class list and adjust CSS height offset (e.g., `calc(100vh - 176px)`) so that vertical margin separates `#pageHeader` and `#editorWorkspace` without viewport overflow
- [x] 3.2 Add automated test assertions in `test/markdown-editor.test.js` verifying that `#editorWorkspace` includes `mt-3` or `my-3` for vertical margin separation, and verify with `npm test`

## 4. Verification and Regression Testing

- [x] 4.1 Run the full test suite via `npm test` and verify all tests pass with zero regressions
