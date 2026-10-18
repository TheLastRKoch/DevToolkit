# Shared Page Header and Browser Sessions

## What Changes

This change introduces four capabilities to the DevToolkit web application:

1. **Shared page header component** – Extract the repeated page-header markup
   (logo/title, nav links, theme toggle) from each Thymeleaf template into a
   single reusable fragment so that future pages inherit a consistent header
   automatically.

2. **Conditional browser-side session persistence with versioning** – Add
   `localStorage`-based session management to the three editing pages
   (`/text-editor`, `/markdown-editor`, `/template`). Session content and
   version history are persisted **only** if the user explicitly supplies a
   custom title. Untitled sessions remain unsaved, and users attempting to
   close an untitled tab with modified content are prompted with a standard
   browser confirmation dialog. Each titled session keeps the last 3 version
   snapshots using a FIFO strategy, captured on tab/window visibility changes.

3. **Dynamic text-variable template processor** – Build a client-side engine
   that parses `@[variableName]` placeholders inside a template string,
   resolves them against a user-supplied variable map, and renders the final
   output in real time.

4. **Home page session gallery** – The home page gallery displays all saved
   sessions from `localStorage`. Filters are replaced with session kinds
   (text-editor, markdown-editor, template). Each card shows the session title,
   kind, and latest change date; the title links to the session's page, which
   opens with the saved content. A remove button on each card deletes that
   session from storage.

## Why

* **Header duplication** – Every page currently copy-pastes the same `<header>`
  block. A change to the brand name, navigation order, or theme-toggle logic
  must be replicated across every template file, which is error-prone.
* **Lost work on reload** – If a user accidentally refreshes or navigates away
  from the text editor, markdown editor, or template page, all in-progress
  content is lost because nothing is persisted client-side.
* **No template variable system** – The `/template` page has no way to let
  users define dynamic placeholders and preview their substituted output,
  limiting the usefulness of the page.
* **No session overview** – Users have no way to see which sessions they have
  saved across pages, or to manage (delete) them from a central location.

## Goals

| # | Goal |
|---|------|
| G1 | Single-source header: one Thymeleaf fragment, included everywhere |
| G2 | Conditional session persistence: save to `localStorage` only when a valid custom title is provided; version history with 3-snapshot FIFO |
| G3 | Client-side `@[var]` placeholder engine with live preview |
| G4 | Home page gallery of saved sessions with kind filters and delete |

## Non-Goals

* Server-side persistence or user accounts.
* Multi-session support (one session per page type).
* Exporting or importing sessions.
* Session expiry — titled sessions persist until explicitly deleted.

## Scope

### In Scope

* Refactoring existing Thymeleaf templates to use a shared header fragment.
* Implementing conditional `localStorage` persistence: only when a valid
  custom title is provided (non-empty, non-default).
* Title validation (reject "DevToolKit" case-insensitive, empty, whitespace)
  and title immutability (the input stays editable while focused and is disabled
  after it loses focus with a valid title).
* A versioning engine that keeps the last 3 content snapshots per session,
  captured on visibility change / page unload, with deduplication.
* A single-session-per-page data model: one `localStorage` key per page type
  at `devtoolkit:sessions:<kind>`.
* Building a JavaScript module that parses `@[variableName]` tokens and
  replaces them with user-defined values.
* Updating the `/template` page UI to include a variable-definition area and
  a live-rendered output panel.
* Home page gallery reading saved sessions from `localStorage`, with kind
  filters, title links that open the session's page with its stored content, and
  per-session delete.

### Out of Scope

* Backend API changes (all persistence is browser-local).
* Authentication, authorization, or multi-user features.
* Mobile-specific layout adjustments beyond what Bootstrap already provides.
* Multi-session per page or session-ID-based routing.

## Capabilities

### New Capabilities

- `shared-page-header`: one shared options dropdown + title textbox item that
  pages import and configure, including each page's option set, the title
  behavior (validation, immutability after focus loss), and a desktop-centered
  Options dropdown.
- `browser-side-sessions`: browser-local conditional session persistence
  (storage location, title-gated saving, title immutability after focus loss,
  single-session-per-page isolation, FIFO versioning, session lifecycle actions,
  unsaved-change protection for untitled sessions) shared by all session-based
  pages.
- `text-editor-page`: the `/text-editor` endpoint and page introduced by the
  rename, including the legacy `/editor` redirect and the navigation entry.
- `session-gallery`: the home page gallery of saved sessions, with kind
  filters, session cards (title, kind, latest date), title links that reopen the
  session's page, and per-session delete.

### Modified Capabilities

- `template-session-editor`: the requirement that title and session controls
  are grouped in one controls area outside the navbar is superseded by the
  shared page header row (options dropdown, title textbox).
- `dynamic-text-variable-template-processor`: template session uses browser
  storage with conditional persistence, and the title control is provided by
  the shared page header rather than a page-specific header area.

## Impact

- **Routes**: `server.js` gains `/text-editor` and an `/editor` →
  `/text-editor` redirect; `/template`, and every `/api/template/*` endpoint
  keep their current contract. Session-ID routes (`/:sessionId`) are removed.
- **Pages**: `public/editor.html` is renamed to `public/text-editor.html`;
  `public/template.html` and `public/markdown-editor.html` lose their
  duplicated header markup; `public/index.html` gallery is rewired to show
  saved sessions.
- **Scripts**: new shared `public/static/scripts/page-header.js` module
  imported by each page, new `public/static/scripts/text-editor.js`, updated
  `template.js` / `markdown-editor.js` for conditional persistence and
  versioning, updated `gallery.js` to read sessions from `localStorage`.
- **Tests**: `test/routes.test.js` and `test/template.test.js` need new cases
  for the renamed route, the redirect, the shared header, and browser
  sessions; the kept `/api/template/*` tests must keep passing.
- **Docs**: `docs/template.md` must describe browser-side session storage.
