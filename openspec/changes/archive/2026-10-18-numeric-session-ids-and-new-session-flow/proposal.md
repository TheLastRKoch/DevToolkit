# Proposal

## Why

Every page currently owns a single browser session per kind, and the gallery's
title links reopen that same session. Users cannot keep more than one titled
document per page kind, cannot distinguish saved sessions in a URL, and the
gallery's **New** menu reopens the existing session instead of starting fresh.
Numeric per-kind IDs make every saved session addressable and let the New menu
open an empty session.

## What Changes

- Each titled session receives a unique numeric ID within its page kind, so
  `/template/1` and `/text-editor/1` can coexist.
- Storage moves from one document per kind to one document per session at
  `devtoolkit:sessions:<kind>:<id>`.
- `/<kind>` opens a fresh untitled session; `/<kind>/<id>` opens that saved
  session. This applies to `template`, `text-editor`, and `markdown-editor`.
- The New dropdown continues to link to `/<kind>` and therefore always starts a
  fresh session.
- A fresh session receives its ID on the first valid title save, and the page
  replaces the URL with `/<kind>/<id>` without reloading.
- Gallery cards link to `/<kind>/<id>`, and delete removes that specific
  session.
- Existing single-session data at `devtoolkit:sessions:<kind>` is migrated to
  that kind's ID `1` on first use.
- **BREAKING**: session storage keys and page routes gain an ID segment. Existing
  stored data is migrated rather than discarded.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-side-sessions`: multiple sessions per kind, per-session storage keys,
  numeric ID allocation and migration, and ID assignment on first title save.
- `session-gallery`: ID-based card links, delete by session ID, and a New menu
  that always opens a fresh session.
- `text-editor-page`: `/<kind>` and `/<kind>/<id>` routes for the text editor,
  including the legacy `/editor/:id` redirect.
- `dynamic-text-variable-template-processor`: template sessions are stored and
  restored per numeric ID instead of a single template session.

## Impact

- `public/static/scripts/browser-session.js`: storage keys, ID allocation,
  migration, `listAll`, and the store API.
- `public/static/scripts/gallery.js`: card links and delete-by-ID.
- `public/static/scripts/{template,text-editor,markdown-editor}.js`: read the
  route ID, open a fresh session when absent, and replace the URL after the
  first title save.
- `server.js`: `/<kind>/:id` routes and `/editor/:id` redirects.
- `public/index.html`: New links keep `/<kind>` and now guarantee a fresh
  session.
- Tests and documentation for routes, storage, gallery, and page restoration.
- The server-side `/api/template/*` API remains unchanged.
