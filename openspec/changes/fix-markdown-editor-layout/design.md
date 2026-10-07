# Design

## Context

The Markdown Editor lives in two files:
- `public/markdown-editor.html` — layout structure, Bootstrap 5 utility classes, and inline CSS.
- `public/static/scripts/markdown-editor.js` — `applyPaneState()` toggling pane visibility and the expand-button event handlers.

The change addresses:
1. **Height asymmetry**: `#rawPane` had three flex children while `#previewPane` had two, resolved by adding a matching 28px bottom status bar to `#previewPane`.
2. **Expand/collapse failure**: `applyPaneState()` toggling was overridden by Bootstrap's `.d-flex !important`, resolved by toggling `.d-none !important`.
3. **Workspace margins and pane widths**: The workspace needs responsive 200px margins on desktop and tablet mode (viewports >= 768px), while keeping 0/standard margins on mobile (< 768px). In split view, `#rawPane` and `#previewPane` must each strictly occupy 50% (half of the workspace width).

## Goals / Non-Goals

**Goals:**
- Both panes render at identical height in split view.
- Clicking `[]` on either pane successfully hides the opposite pane.
- `#editorWorkspace` has a 200px left margin and 200px right margin in desktop and tablet mode (>= 768px).
- `#editorWorkspace` has no 200px margin in mobile mode (< 768px).
- `#rawPane` and `#previewPane` share equal halves (50% width each) in split view.

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
On mobile devices (`< 768px`), `#editorWorkspace` uses the default container margins without side insets, preserving usability on narrow screens.

### Decision 4 — Equal 50/50 Split Width
Configure `#rawPane` and `#previewPane` with `flex: 1 1 50%; width: 50%; min-width: 0;` so that each pane rigidly occupies half of the workspace in split view and doesn't expand past 50% due to content length. When a pane is expanded to full screen, the opposite pane receives `d-none` and the active pane fills the workspace width (`flex-grow: 1`).

## Risks / Trade-offs

- **Breakpoint alignment**: Using `min-width: 768px` aligns directly with Bootstrap 5's `md` (medium/tablet) breakpoint, matching other responsive elements on the page (such as `#paneDivider` using `d-none d-md-block`).
