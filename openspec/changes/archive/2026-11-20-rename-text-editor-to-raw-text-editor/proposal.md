# Proposal

## Why

The `/text-editor` page is a rich-text (Quill) editor, yet its name suggests a
plain-text tool, which confuses users choosing between it and the markdown/code
editors. Separately, pasted content keeps its original background colors, font
colors, fonts, sizes, and heading levels, so sessions end up with inconsistent
styling that does not match the editor's own appearance.

## What Changes

- **BREAKING** Rename the page endpoint from `/text-editor` and
  `/text-editor/<id>` to `/raw-text-editor` and `/raw-text-editor/<id>`. The old
  `/text-editor` routes are removed and respond `404`; no redirect is kept.
- Point the legacy `/editor` and `/editor/<id>` redirects at the new
  `/raw-text-editor` paths.
- Rename the page's browser-session kind from `text-editor` to
  `raw-text-editor`, so sessions are stored, listed, and linked under the new
  name. Existing sessions stored under the old kind are not migrated.
- Present the page and its navigation entry as `Raw Text Editor`.
- On every paste into the editing surface, remove any background color, discard
  the pasted font family, font size, and heading level, and set the pasted
  text's font color to black, so pasted content uses the editor's default font
  and plain appearance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `text-editor-page`: the page is served at `/raw-text-editor`, is named `Raw
  Text Editor`, keeps `/editor` redirecting to the new endpoint, and gains a
  paste-normalization requirement.
- `browser-side-sessions`: the rich-text page kind becomes `raw-text-editor`
  and its example session path changes.
- `session-gallery`: the gallery lists and filters `raw-text-editor` sessions,
  opens `/raw-text-editor/<id>`, and links the New entry to the new route.
- `editor-workspace-margins`: the margin toggle applies to the raw text editor
  route.
- `shared-page-footer`: the footer coverage lists the raw text editor route.

## Impact

- `server.js` route table (new routes, removed `/text-editor` routes, updated
  `/editor` redirects).
- `public/text-editor.html` and `public/static/scripts/text-editor.js`
  (renamed; paste handling added to the page script).
- `public/index.html` New dropdown entry and `public/static/scripts/gallery.js`
  kind mapping.
- `openspec/specs/*` for the modified capabilities above.
- Tests in `test/` (route, page, gallery, integration, and harness helpers) plus
  the mock Dom/Quill stubs needed to exercise paste.
