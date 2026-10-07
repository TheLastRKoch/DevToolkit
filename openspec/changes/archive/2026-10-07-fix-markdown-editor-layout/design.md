# Design

## Context

The Markdown Editor lives in two files:
- `public/markdown-editor.html` — layout structure, Bootstrap 5 utility classes, and inline CSS.
- `public/static/scripts/markdown-editor.js` — `applyPaneState()` toggling pane visibility and the expand-button event handlers.

The change addresses:
1. **Height asymmetry**: `#rawPane` had three flex children while `#previewPane` had two, resolved by adding a matching 28px bottom status bar to `#previewPane`.
2. **Expand/collapse failure**: `applyPaneState()` toggling was overridden by Bootstrap's `.d-flex !important`, resolved by toggling `.d-none !important`.
3. **Workspace margins and desktop/tablet split**: On viewports >= 768px, the workspace has 200px margins on left and right, and panes are arranged side-by-side (50% width each).
4. **Mobile layout (Option A)**: On viewports < 768px, the workspace stacks vertically (`flex-column`), placing the raw editor on top (50% height, 100% width) and the preview on the bottom (50% height, 100% width), separated by `#paneDividerMobile`, with no 200px side margins.

## Goals / Non-Goals

**Goals:**
- Both panes render at identical height in desktop/tablet split view.
- Clicking `[]` on either pane successfully hides the opposite pane.
- `#editorWorkspace` has a 200px left margin and 200px right margin in desktop and tablet mode (>= 768px).
- `#editorWorkspace` has no 200px margin in mobile mode (< 768px).
- In desktop and tablet mode (>= 768px), `#rawPane` and `#previewPane` share equal halves (50% width each) side by side.
- In mobile mode (< 768px), `#rawPane` and `#previewPane` stack top and bottom (50% height each, 100% width).

**Non-Goals:**
- Resizable pane splitter (drag-to-resize).
- Any change to scroll-sync, markdown rendering, or character count logic.

## Decisions

### Decision 1 — Equal vertical heights
Add a matching empty spacer status bar of identical height (`min-height: 28px`) to `#previewPane` with `border-top` and `bg-light` to mirror `#editorStatusBar`.

### Decision 2 — Expand/collapse using Bootstrap's `d-none`
Toggle `.d-none` via `classList.add('d-none')` and `classList.remove('d-none')` in `applyPaneState()`. Because Bootstrap defines `.d-none { display: none !important }` after `.d-flex { display: flex !important }`, this cleanly hides panes and dividers without inline style conflicts.

### Decision 3 — Responsive 200px Left and Right Margins
Apply the 200px margins inside a media query targeting tablet and desktop viewports (`@media (min-width: 768px)`):
```css
@media (min-width: 768px) {
    #editorWorkspace {
        margin-left: 200px;
        margin-right: 200px;
    }
}
```
On mobile devices (`< 768px`), `#editorWorkspace` uses standard container margins without side insets.

### Decision 4 — Responsive Pane Orientation and Split Sizing
In `public/markdown-editor.html`:
- Set `#editorWorkspace` class to `d-flex flex-column flex-md-row ...`.
- Configure `#rawPane` and `#previewPane` in CSS:
```css
#rawPane,
#previewPane {
    min-width: 0;
    min-height: 0;
    flex: 1 1 50%;
    width: 100%;
    height: 50%;
}

@media (min-width: 768px) {
    #rawPane,
    #previewPane {
        width: 50%;
        height: 100%;
    }
}
```
When expanding on mobile: the active pane expands to 100% height because the opposite pane and `#paneDividerMobile` receive `.d-none`.
When expanding on desktop: the active pane expands to 100% width because the opposite pane and `#paneDivider` receive `.d-none`.

## Risks / Trade-offs

- **Small screens (< 768px) height allocation**: At 50% height each, both panes remain usable for editing and previewing without horizontal crowding.
