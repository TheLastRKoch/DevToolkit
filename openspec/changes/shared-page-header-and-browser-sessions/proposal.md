# Proposal

## Why

The three editing screens have drifted apart: `/template` owns a working title
field and three session buttons, `/editor` renders a breadcrumb plus an Options
dropdown whose items do nothing, and `/markdown-editor` has neither a page-name
field nor any actions. Each page therefore re-implements (or omits) the same
breadcrumb/name/options row, and the page name only actually does something on
`/template`. On top of that, template sessions live in a process-memory `Map`,
so state is lost on restart, cannot survive the server's lifetime, and cannot be
used by the pages that have no server session at all.

## What Changes

- Rename the editor endpoint and page from `editor` to `text editor`:
  `/editor` → `/text-editor`, `public/editor.html` → `public/text-editor.html`,
  and update the Home link and breadcrumb label to "Text Editor". `/editor`
  keeps working as a redirect so existing bookmarks do not break.
- Extract one shared page header item — breadcrumb, Options dropdown, and
  page-name textbox in a single row — that pages import and configure with their
  own breadcrumb trail, option list, and name behavior.
- Adopt that shared header on `/template`, `/text-editor`, and
  `/markdown-editor`, replacing the current per-page duplicated markup. The
  `/template` session buttons (New session, Clear variables, Clear all) move
  into the shared Options dropdown; `/markdown-editor` gains the page-name
  textbox and a "Clear editor" option.
- Give every session-based page a page-name textbox that renames the page and
  updates `document.title`, matching the current `/template` behavior.
- **BREAKING** (internal state model): move session state from the server-side
  in-memory `Map` to browser-side `localStorage`, so each page owns its own
  persisted, addressable sessions with a 30-day expiry.
- Keep the existing `/api/template/*` endpoints working unchanged alongside the
  browser-side sessions.

## Capabilities

### New Capabilities

- `shared-page-header`: one shared breadcrumb + options dropdown + page-name
  textbox item that pages import and configure, including each page's option set
  and the page-name behavior.
- `browser-side-sessions`: browser-local session persistence (storage location,
  identity, isolation, 30-day expiry, session lifecycle actions, unsaved-change
  protection) shared by all session-based pages.
- `text-editor-page`: the `/text-editor` endpoint and page introduced by the
  rename, including the legacy `/editor` redirect and the navigation entry.

### Modified Capabilities

- `template-session-editor`: the requirement that title and session controls are
  grouped in one controls area outside the navbar is superseded by the shared
  page header row (breadcrumb, options dropdown, page-name textbox).
- `dynamic-text-variable-template-processor`: template sessions are isolated in
  browser storage instead of server memory, and the title control is provided by
  the shared page header rather than a page-specific header area.

## Impact

- **Routes**: `server.js` gains `/text-editor`, `/text-editor/:sessionId`,
  `/markdown-editor/:sessionId`, and an `/editor` → `/text-editor` redirect;
  `/template`, `/template/:sessionId`, and every `/api/template/*` endpoint keep
  their current contract.
- **Pages**: `public/editor.html` is renamed to `public/text-editor.html`;
  `public/template.html` and `public/markdown-editor.html` lose their duplicated
  header markup; `public/index.html` link label changes.
- **Scripts**: new shared `public/static/scripts/page-header.js` module imported
  by each page, new `public/static/scripts/text-editor.js`, and updated
  `template.js` / `markdown-editor.js` to back the page name and options with
  browser storage.
- **Tests**: `test/routes.test.js` and `test/template.test.js` need new cases for
  the renamed route, the redirect, the shared header, and browser sessions; the
  kept `/api/template/*` tests must keep passing.
- **Docs**: `docs/template.md` must describe browser-side session storage.
