# Proposal

## Why

DevToolkit currently has visual and layout defects across multiple pages:
1. On the home page (`/`), the footer is positioned directly below the main content container without full-height flex positioning, causing the footer to float awkwardly in the middle of the screen when saved sessions do not fill the viewport.
2. On the Markdown Editor page (`/markdown-editor`), there is no vertical spacing between the shared page header (options and title row) and the editor workspace containing the raw markdown input and preview pane, causing the controls and editor boxes to visually collide.
3. The footer across all pages currently displays static copyright text (`&copy; <span id="currentYear"></span> Devtoolkit. All rights reserved.`), which should be replaced with an open-source friendly link inviting users to fork the project on GitHub.

## What Changes

- Update the home page (`/`) layout in `public/index.html` to use a sticky full-height flex container (`d-flex flex-column min-vh-100`) with a flexible main section (`flex-grow-1`) so the footer is always anchored at the bottom of the viewport even with sparse content.
- Update `/markdown-editor` in `public/markdown-editor.html` to add vertical separation (margin) between the `#pageHeader` mount point and the `#editorWorkspace` container, preventing visual overlap between the header options and editor/preview boxes.
- Replace the footer text across all DevToolkit HTML pages (`public/index.html`, `public/markdown-editor.html`, `public/template.html`, `public/text-editor.html`) from `&copy; <span id="currentYear"></span> Devtoolkit. All rights reserved.` to `DevToolKit fork me on github`, where `github` is a hyperlink pointing to `https://github.com/TheLastRKoch/devtoolkit`.
- Clean up any unused footer date population logic or retain safe element lookups in client scripts without breaking existing functionality.

## Capabilities

### New Capabilities
- `shared-page-footer`: Defines the standard application footer across all DevToolkit pages, including the "DevToolKit fork me on github" link and sticky bottom viewport positioning on the home page (`/`).
- `markdown-editor-page`: Defines page-level layout requirements for `/markdown-editor`, including vertical spacing between the page header controls and the editor workspace panes.

### Modified Capabilities
<!-- None -->

## Impact

- Affected files:
  - `public/index.html`: Body flex styling, main container flex-grow, and updated footer content.
  - `public/markdown-editor.html`: Vertical spacing margin on workspace/header and updated footer content.
  - `public/template.html`: Updated footer content.
  - `public/text-editor.html`: Updated footer content.
  - `test/`: Existing test assertions for page markup and tests verifying new layout and footer text.
- No breaking API or data schema changes; backward compatible with existing session persistence and routing.
