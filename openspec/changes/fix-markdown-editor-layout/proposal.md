# Proposal

## Why

The `/markdown-editor` page has layout and toggle issues: the raw-markdown pane was shorter than the preview pane, the `[]` expand button failed to hide the opposite pane, and the editor layout needs centered responsive margins with an exact 50/50 split between the raw editor and preview.

## What Changes

- Fix the height asymmetry between the raw pane (`#rawPane`) and the preview pane (`#previewPane`) so both panes render at equal height inside the editor workspace.
- Fix the expand/collapse toggle so clicking `[]` in the raw pane hides the preview pane (and vice-versa), enabling true full-screen single-pane mode.
- Add a 200px left and right margin to the editor workspace container (`#editorWorkspace`) in desktop and tablet mode (screens >= 768px), while keeping standard margin in mobile mode (< 768px).
- Ensure the raw markdown pane and the preview pane each occupy exactly half (50%) of the workspace width in split view.

## Capabilities

### New Capabilities

- `markdown-editor`: Specifies the layout and pane-toggle behavior requirements for the Markdown Editor page, covering equal-height split-view layout, functional per-pane expand/collapse controls, responsive 200px horizontal margins on desktop/tablet, and equal 50/50 split width.

### Modified Capabilities

_(none — this capability does not yet exist in `openspec/specs/`)_

## Impact

- **`public/markdown-editor.html`**: CSS media query for `#editorWorkspace` margins, `#rawPane` / `#previewPane` flex sizing.
- **`public/static/scripts/markdown-editor.js`**: `applyPaneState()` function and expand-button event handlers.
- **`test/markdown-editor.test.js`**: Automated assertions covering status bars, expand toggle, responsive 200px margins, and 50/50 split.
- No API, server, or dependency changes required.
