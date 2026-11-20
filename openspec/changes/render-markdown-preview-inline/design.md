# Design

## Context

See `proposal.md — Why`. The page is a single static HTML file with inline CSS plus a plain-script controller, backed by existing test harnesses that simulate the DOM.

Current structure in [`public/markdown-editor.html`](../../../../public/markdown-editor.html):

- `#editorWorkspace` is a Flexbox card (`border rounded shadow-sm overflow-hidden bg-white`) with a fixed height of `calc(100vh - 176px)`.
- `#rawPane` and `#previewPane` split the card 50/50 (`flex: 1 1 50%`; stacked at 50% height below 768 px, side by side at 50% width above).
- `#mdPreview` is an `overflow-auto` `div` that owns its own scrollbar.
- [`public/static/scripts/markdown-editor.js`](../../../../public/static/scripts/markdown-editor.js) runs bidirectional proportional scroll synchronization between `#mdInput` and `#mdPreview`, and per-pane expand/restore toggles that add `d-none` to the opposite pane.

Because the preview cannot scroll independently, the fixed-height card and the scroll sync no longer have a meaning.

## Goals / Non-Goals

**Goals:**

- Rendered markdown becomes page content: no card chrome around it, no nested scrollbar, no fixed preview height.
- The raw editor and the rendered preview remain usable side by side at 768 px and wider, stacked below that.
- Expand/restore still lets either pane use the full page width.
- No behavior change to rendering, sessions, margins, character count, or the Options dropdown.

**Non-Goals:**

- Changing the markdown renderer (`marked`) or its options, including sanitization policy.
- Changing session storage, routing, or the shared page header.
- Adding a preview-only reading mode, typography rework, or new dropdown options.
- Keeping scroll synchronization in any form.

## Decisions

### 1. Drop the fixed workspace height; let the page own scrolling

`#editorWorkspace` stops setting `height: calc(100vh - 176px)` and stops clipping (`overflow-hidden`). `#mdPreview` loses `overflow-y: auto`, so it expands to its content height and the document scrolls with the page.

*Alternative considered:* Keep the card height and only remove the border. Rejected — the preview would still be a 50%-height keyhole with clipped content, which is the problem being fixed.

### 2. Give the raw editor its own bounded height instead of stretching both panes

The textarea cannot grow without bound, so `#rawPane` keeps an explicit usable height (a viewport-derived `min-height`/`height` on `#mdInput`) while the preview pane is content-sized. The split stays visually side by side; each column simply ends where its content ends.

*Alternative considered:* Grow the textarea with its content until both columns match. Rejected — the textarea would push the preview down on narrow viewports and reintroduce nested scrolling plus layout thrash on every keystroke.

### 3. Remove the card chrome from the workspace and keep a border on the raw pane only

The user's request is about the rendered output reading as a text box. The raw editor legitimately stays an input control, so its visual boundary is kept. The workspace wrapper loses `border rounded shadow-sm overflow-hidden bg-white`, and the preview pane keeps only spacing and typography rules.

*Alternative considered:* Remove every border on the page. Rejected — the raw textarea needs a visible boundary to read as editable, and the request scoped the change to the preview.

### 4. Delete scroll synchronization and the preview's scroll listener

With no independent preview scrollbar, `syncScroll`, `isSyncing`, and both `scroll` listeners are removed. The raw textarea keeps its native scrolling.

*Alternative considered:* Keep sync one-way from the textarea to `window.scrollTo`. Rejected — it hijacks page scrolling and fights the user; the requirement only needs live rendering, not scroll mirroring.

### 5. Keep the expand/restore toggles and their `d-none` contract

Expanding the preview still hides `#rawPane` and the divider so the rendered document uses the full page width. The existing class-based state machine (`focusedPane`, `applyPaneState`) is preserved, minus the removed scroll helpers, so the existing harness assertions keep working with only layout-specific updates.

*Alternative considered:* Replace the toggles with a single layout switch. Rejected — out of scope and it would change the dropdown/UI contract the tests and docs describe.

### 6. Update the layout tests to assert the new invariants

The existing tests assert the fixed 50% heights and the card markup. They are rewritten to assert the new contract: no fixed workspace height, no `overflow-auto` on `#mdPreview`, preview width split retained at 768 px and wider, and stacked ordering below it.

*Alternative considered:* Delete the layout assertions. Rejected — they are the only automated check that the split and margins still work.

## Risks / Trade-offs

- **Very long documents make the page tall** → Intended: the page is the reading surface. The expand toggle gives a distraction-free full-width read.
- **Side-by-side columns end at different heights** → Acceptable; the raw editor column ends with its bounded height, the preview continues as page content. Visual separation stays via the divider on wide viewports.
- **Removing scroll sync may surprise existing users** → The preview no longer clips, so alignment between the two panes is less necessary; the change is documented in `docs/pages.md`.
- **Mobile stacking order** → Raw editor stays first so typing comes before reading, matching the current order.

## Migration Plan

1. Update `public/markdown-editor.html`: workspace wrapper classes, preview pane styles, remove fixed heights and preview overflow.
2. Update `public/static/scripts/markdown-editor.js`: delete scroll-sync code, keep `updateContent` and pane-state handling.
3. Update `test/markdown-editor.test.js`, `test/markdown-editor-page.test.js`, and `test/helpers/pages.js` assertions and harness ids.
4. Update `docs/pages.md`.
5. Rollback is a revert of the page, script, tests, and docs files; no data or schema migration is involved.

## Open Questions

*(none)*
