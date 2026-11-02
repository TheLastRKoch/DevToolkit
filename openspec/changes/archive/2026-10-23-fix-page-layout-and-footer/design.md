# Design

## Context

DevToolkit consists of 4 primary HTML pages served from `public/`:
- Home page (`public/index.html`)
- Markdown Editor (`public/markdown-editor.html`)
- Template Editor (`public/template.html`)
- Text Editor (`public/text-editor.html`)

Currently, `public/index.html` lacks `d-flex flex-column min-vh-100` on `<body>` and `flex-grow-1` on `<main>`, whereas the other 3 pages already use these Bootstrap utilities. Consequently, when the home page gallery is empty or has few items, the footer rests directly beneath the controls rather than anchoring at the bottom of the viewport.

On `public/markdown-editor.html`, `#pageHeader` mounts a row with `class="row mt-3 align-items-center"` and no bottom margin. The succeeding `#editorWorkspace` container has `class="... mb-3"` without any top margin, leaving 0px margin between the header options and the editor workspace border.

All 4 pages contain identical or near-identical footer markup referencing copyright text:
`<footer class="bg-light"><div class="text-center py-2">&copy; <span id="currentYear"></span> Devtoolkit. All rights reserved.</div></footer>`

## Goals / Non-Goals

**Goals:**
- Anchor the footer at the bottom of the viewport on `/` using standard Bootstrap flex utilities (`d-flex flex-column min-vh-100` on `<body>` and `flex-grow-1` on `<main>`).
- Add vertical margin separation (`mt-3`) above `#editorWorkspace` in `public/markdown-editor.html` to separate it from `#pageHeader`.
- Standardize footer markup across `index.html`, `markdown-editor.html`, `template.html`, and `text-editor.html` to render `DevToolKit fork me on <a href="https://github.com/TheLastRKoch/devtoolkit" target="_blank" rel="noopener noreferrer">github</a>`.
- Ensure all automated unit and integration tests pass cleanly.

**Non-Goals:**
- Refactoring `page-header.js` or changing how other pages mount their headers.
- Altering server routes, session persistence schemas, or editor functionality.
- Introducing external CSS frameworks or custom footer component scripts.

## Decisions

### 1. Flexbox Sticky Footer Layout for `/`
- **Choice**: Apply `class="d-flex flex-column min-vh-100"` to `<body>` and add `flex-grow-1` to `<main class="container pb-5">` in `public/index.html`.
- **Alternative considered**: `position: fixed` or `position: absolute` bottom footer.
- **Rationale**: Absolute/fixed positioning covers content when the session gallery grows or on small screens. The Bootstrap flex column layout is already utilized on `/template`, `/text-editor`, and `/markdown-editor`, creating a consistent structural pattern across all pages.

### 2. Vertical Separation on `/markdown-editor`
- **Choice**: Add `mt-3` to `#editorWorkspace`'s class list (`d-flex flex-column flex-md-row flex-grow-1 border rounded shadow-sm overflow-hidden bg-white my-3` or `mt-3 mb-3`), and adjust `#editorWorkspace` height in `<style>` (e.g. `calc(100vh - 176px)` or flex-based sizing) so the container fits comfortably without unexpected page-level scrolling.
- **Alternative considered**: Adding `mb-3` directly inside `page-header.js`.
- **Rationale**: `page-header.js` is shared across multiple pages (`template.html`, `text-editor.html`), and both already provide top margins on their respective content sections (`<div class="row flex-grow-1 ... mt-3">`). Modifying `public/markdown-editor.html` directly aligns it with the existing pattern used by other pages without risking regressions in `template.html` or `text-editor.html`.

### 3. Footer Markup and Anchor Structure
- **Choice**: Use `<footer class="bg-light"><div class="text-center py-2">DevToolKit fork me on <a href="https://github.com/TheLastRKoch/devtoolkit" target="_blank" rel="noopener noreferrer">github</a></div></footer>` across all 4 pages.
- **Alternative considered**: Client-side JS rendering of footer.
- **Rationale**: Static HTML markup is lightweight, reliable, fast to load, and does not require DOM hydration. Client scripts (`gallery.js`, `template.js`, `markdown-editor.js`, `text-editor.js`) already guard against missing `currentYear` elements (`if (currentYearEl)`), ensuring no JavaScript errors occur.

## Risks / Trade-offs

- **[Risk]** Workspace height calculation in `markdown-editor.html` (`calc(100vh - 160px)`) could cause double scrollbars if `mt-3` is added without adjusting the height offset.
  → **Mitigation**: Adjust the CSS calc offset in `markdown-editor.html` from `160px` to `176px` (accounting for the 16px `mt-3` margin) to ensure the viewport does not overflow vertically on desktop.
- **[Risk]** Existing tests might assert specific footer markup or presence of `currentYear`.
  → **Mitigation**: Verified test files; tests only reference `currentYear` as a mock DOM id in `mock-dom.js` and do not assert copyright text strings. Ensure all 104 tests continue to pass.
