# Design

## Context

DevToolKit currently hosts three browser-side utility tools: Template Editor, Text Editor, and Markdown Editor. Each tool follows an architectural pattern where:
- The server (`server.js`) acts purely as a static host serving `/kind` and `/kind/:id` routes.
- The client-side pages share standard Bootstrap 5 styling, a top navbar linking back to `/`, a shared page header component (`page-header.js`), and a common footer.
- State is managed browser-side via `browser-session.js` using `localStorage` keyed by `devtoolkit:sessions:<kind>:<id>`.
- Untitled sessions remain local and trigger `beforeunload` warnings on dirty state; titled sessions allocate a numeric ID, persist, and snapshot up to three versions on tab navigation or visibility change.
- The home page gallery (`gallery.js` and `index.html`) renders saved session cards, provides kind-based filtering, and offers a "New" dropdown menu targeting ID-less routes.

A standalone `list-compare.html` tool currently exists outside the application with all logic embedded in an inline `<script>` block. This design integrates the tool into DevToolKit following the existing patterns.

## Goals / Non-Goals

**Goals:**
- Provide `/list-compare` and `/list-compare/:id` routes in `server.js`.
- Move all JavaScript logic from `list-compare.html` into `public/static/scripts/list-compare.js` following strict IIFE modularity.
- Integrate the shared page header (`#pageHeader`) and support the "Clear all" action.
- Store and restore both List A and List B text box contents in the session store (`devtoolkit:sessions:list-compare:<id>`).
- Add `list-compare` to the gallery kinds list, kind filter buttons, and the "New" dropdown menu.
- Ensure 100% compatibility with existing test suites and add comprehensive tests for the new view.

**Non-Goals:**
- Server-side comparison processing or server-side session persistence (all operations remain local/client-side).
- Re-architecting `browser-session.js` storage engine (we leverage JSON serialization within the session `content` property).
- Modifying other existing views or altering their independent session storage.

## Decisions

### 1. Serialized Content Payload for Two-Input Session State
- **Decision**: Store List A and List B contents as a JSON-encoded string within the `content` property: `JSON.stringify({ listA: textA, listB: textB })`.
- **Rationale**: `browser-session.js` already provides robust versioning, dirty checking, deduplication (`samePayload` checks `left.content === right.content`), and storage quota handling on the `content` string. Serializing both inputs into `content` avoids breaking changes to `browser-session.js` and maintains seamless compatibility with existing session storage mechanisms.
- **Alternatives Considered**:
  - *Modifying `browser-session.js` to add custom top-level fields*: Rejected because it would require modifying core session contracts across all kinds and testing frameworks.
  - *Storing only List A in `content` and List B in a custom attribute*: Rejected because deduplication and snapshots would only track List A.

### 2. Externalizing Script to `public/static/scripts/list-compare.js`
- **Decision**: Extract all inline script logic from `list-compare.html` into an external script file wrapped in an IIFE (`(function () { 'use strict'; ... }());`), exposing test hooks or DOM listeners as required.
- **Rationale**: Complies with the user requirement ("do not have all the script logic in the html file") and matches the pattern established by `text-editor.js`, `markdown-editor.js`, and `template.js`.
- **Alternatives Considered**:
  - *ES modules (`type="module"`)*: Rejected because DevToolkit scripts currently use classic scripts and CommonJS/UMD patterns for test harness compatibility via `mock-dom.js`.

### 3. Layout Structure and Shared Component Integration
- **Decision**: Keep the list comparison grid and controls, but replace the standalone top header and navbar with DevToolKit's standard navbar, shared page header (`<div id="pageHeader"></div>`), and standard footer.
- **Rationale**: Ensures visual and functional consistency across all tools in DevToolKit while preserving the complete comparison, deduplication, regex replacement, file loading, and export functionality of the original tool.

### 4. Shared Header Options Contract
- **Decision**: The List Compare page registers `{ id: 'clear-all', label: 'Clear all', run: clearAll }` with `DevToolkitPageHeader.initPageHeader`.
- **Rationale**: Consistent with `template.js` which also exposes a `Clear all` option to clear editing state while keeping the session title.

## Risks / Trade-offs

- **[Risk] Large input lists causing `localStorage` quota exceeded**: Users pasting very large lists could trigger `QuotaExceededError`.
  - *Mitigation*: `browser-session.js` includes `onWriteError` callback handling that alerts the user via `header.warn('Changes will not be persisted in this browser.')`, while keeping the in-memory state intact.
- **[Risk] Corrupt or empty stored session payload**: If a stored session has unparseable or legacy string content in `content`.
  - *Mitigation*: Gracefully parse with `try/catch`; if parsing fails, fallback to empty strings for `listA` and `listB`.
