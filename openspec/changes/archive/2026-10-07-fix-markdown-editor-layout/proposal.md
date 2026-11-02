# Proposal

## Why

The `/markdown-editor` page has layout and toggle issues: the raw-markdown pane was shorter than the preview pane, the `[]` expand button failed to hide the opposite pane, and the editor layout needs centered responsive margins on desktop/tablet with a stacked top/bottom 50/50 split on mobile devices.

## What Changes

- Fix the height asymmetry between the raw pane (`#rawPane`) and the preview pane (`#previewPane`) so both panes render at equal height inside the editor workspace.
- Fix the expand/collapse toggle so clicking `[]` in the raw pane hides the preview pane (and vice-versa), enabling true full-screen single-pane mode.
- Add a 200px left and right margin to the editor workspace container (`#editorWorkspace`) in desktop and tablet mode (screens >= 768px), while keeping standard margin in mobile mode (< 768px).
- In tablet and desktop modes (screens >= 768px), configure the raw markdown pane and the preview pane side by side, each occupying 50% width.
- In mobile mode (screens < 768px), stack the raw markdown pane on top and the preview pane on the bottom, each occupying 50% height of the workspace.

## Capabilities

### New Capabilities

- `markdown-editor`: Specifies the layout and pane-toggle behavior requirements for the Markdown Editor page, covering equal-height split-view layout, functional per-pane expand/collapse controls, responsive 200px horizontal margins on desktop/tablet, side-by-side 50/50 width on desktop/tablet, and stacked top/bottom 50/50 height on mobile.

### Modified Capabilities

_(none — this capability does not yet exist in `openspec/specs/`)_

## Impact

- **`public/markdown-editor.html`**: HTML classes and CSS media queries for `#editorWorkspace` orientation and responsive pane height/width sizing.
- **`public/static/scripts/markdown-editor.js`**: `applyPaneState()` function and expand-button event handlers.
- **`test/markdown-editor.test.js`**: Automated assertions covering status bars, expand toggle, responsive 200px margins, desktop side-by-side 50/50 width, and mobile top/bottom 50/50 height.
- No API, server, or dependency changes required.
