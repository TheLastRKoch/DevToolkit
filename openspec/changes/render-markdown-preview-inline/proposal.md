# Proposal

## Why

On `/markdown-editor` the rendered markdown is confined to a bordered panel with its own scrollbar, so long documents are read through a small window instead of as page content. The preview should read like the page itself: rendered HTML laid out in the page flow while the raw editor stays beside it.

## What Changes

- Remove the boxed preview panel on `/markdown-editor`: no card border, rounded corners, shadow, or background wrapper around the rendered markdown.
- Let the rendered markdown flow in the page: the preview grows with its content, the page scrolls, and there is no nested scrolling region inside the preview.
- Keep the side-by-side split: raw markdown editor on one side, rendered output on the other at viewports 768 px and wider, stacked vertically below that.
- Keep live rendering (preview updates as the user types), the shared Options dropdown (`Toggle margins`, `Clear editor`), the character count, the workspace margins toggle, and session persistence unchanged.
- Remove the bidirectional scroll synchronization between the raw editor and the preview, because the preview no longer owns a scroll position.
- Keep the per-pane expand/restore controls working: expanding the preview hides the raw editor so the rendered document uses the full page width.

## Capabilities

### New Capabilities

*(none — the change modifies an existing capability)*

### Modified Capabilities

- `markdown-editor-page`: the page must render its markdown preview directly in the page flow, without a bordered or independently scrolling preview panel, while preserving the raw/preview split.

## Impact

- [`public/markdown-editor.html`](../../../../public/markdown-editor.html) — workspace, preview pane, and preview styles (borders, fixed heights, inner overflow)
- [`public/static/scripts/markdown-editor.js`](../../../../public/static/scripts/markdown-editor.js) — preview scroll synchronization and pane-state handling
- [`test/markdown-editor.test.js`](../../../../test/markdown-editor.test.js), [`test/markdown-editor-page.test.js`](../../../../test/markdown-editor-page.test.js), [`test/helpers/pages.js`](../../../../test/helpers/pages.js) — layout assertions and harness ids
- [`docs/pages.md`](../../../../docs/pages.md) — markdown editor description
- No server routes, API contracts, session storage formats, or dependencies change.
