# Design

See `proposal.md` for motivation and `specs/` for the behavioral contract.

## Context

- `server.js` owns the route table. `/text-editor` and `/text-editor/:id`
  currently call `servePage`/`serveSessionPage`; `/editor` and `/editor/:id`
  already redirect (301) to the text editor routes.
- The page is `public/text-editor.html`, which loads
  `public/static/scripts/text-editor.js`. The script hard-codes
  `KIND = 'text-editor'`, which is both the browser-storage namespace
  (`devtoolkit:sessions:<kind>:<id>`) and the route segment used by
  `DevToolkitSessions.sessionIdFromPath` / `pagePath`.
- `public/static/scripts/gallery.js` holds its own `KINDS` list and
  `PAGE_BY_KIND` route map; `public/index.html` has the New dropdown entries.
- The editor is Quill 2.0.2 loaded from a CDN. Its `Clipboard` module binds a
  `paste` listener on `quill.root`, synchronously converts pasted HTML, applies
  the built-in matchers from `CLIPBOARD_CONFIG` (including `matchStyles`, which
  turns inline `background-color`/`color` into `background`/`color`
  attributes), then applies custom matchers registered with `addMatcher`, and
  finally calls `updateContents(delta, 'user')`. Quill exposes no paste-specific
  clipboard hook.
- Tests run on Node's test runner against a mock DOM (`test/helpers/mock-dom.js`)
  and a stub Quill (`test/helpers/pages.js`). The stub implements `convert`,
  `setContents`, `on`, `emit`, and a plain `root` object only.

## Goals / Non-Goals

**Goals:**

- One route name, one page file, one script, one session kind, one visible name:
  `raw-text-editor` / `Raw Text Editor`.
- Paste cleanup that is scoped to paste events and leaves typed, restored, and
  programmatically inserted content untouched.
- Keep the existing page behavior (sessions, versions, margins, clear, header)
  intact.

**Non-Goals:**

- Migrating or deleting browser sessions stored under the former `text-editor`
  kind. They become invisible to the app; their storage keys are left in place.
- Changing the editor's toolbar, themes, or format set.
- Sanitizing pasted non-text payloads (images, files).

## Decisions

### Rename by deleting the old route rather than redirecting

The `/text-editor` handlers are removed and `/editor` redirects straight to
`/raw-text-editor`. A 301 from `/text-editor` to the new path was rejected
because the user asked for a rename, not an alias; `/editor` remains the only
legacy entry point. Client-side, the session kind becomes `raw-text-editor`, so
`sessionIdFromPath`, `pagePath`, gallery links, and storage keys all agree
without special cases.

### Rename files and the session kind together

`public/text-editor.html` → `public/raw-text-editor.html`,
`public/static/scripts/text-editor.js` → `raw-text-editor.js`, and the page's
`KIND` constant → `raw-text-editor`. A split state (old file names, new kind)
would leave misleading identifiers but no functional benefit, so the rename is
all-or-nothing.

### Normalize pasted content inside a paste-scoped clipboard matcher

Register once at startup:

- a document-level capture `paste` listener that sets `pasting = true` when the
  event target is `quill.root` or inside it, and clears the flag with
  `setTimeout(..., 0)`; Quill's root listener runs later in the bubble phase, so
  the conversion it triggers happens synchronously while the flag is set;
- `quill.clipboard.addMatcher(1 /* Node.ELEMENT_NODE */, (node, delta) => ...)`
  that, only while `pasting` is set, walks `delta.ops`, deletes
  `attributes.background`, and assigns `attributes.color = '#000000'` for
  string inserts (embed inserts keep their attributes minus `background`).

Because custom matchers run after `matchStyles`/`matchAttributor`, this removes
both inline `background-color` and Quill `ql-bg-*` class backgrounds, and the
cleaned delta is what `updateContents` applies — so Quill's retained cursor
formats after the paste are clean too.

Alternatives considered:

- **Post-process on `text-change`**: the inserted range is not reported and the
  retained formats are already tainted, so typed text after a paste could
  reintroduce the background.
- **Rewriting `event.clipboardData` HTML**: needs `DOMParser` and manual
  traversal/rewriting of arbitrary pasted markup, and the mock DOM has no
  parser, so it is harder to test.
- **`preventDefault` + `dangerouslyPasteHTML`**: reimplements Quill's paste path
  and loses its plain-text handling.

The element-node constant is written as `1` with a comment instead of relying on
the `Node` global, so the page script stays dependency-free in the test sandbox.

### Cover paste behavior by extending the test doubles

`createQuillStub` gains `addMatcher` (recording matchers so a test can invoke
them with a delta) and a `root` object with `contains()`. `openRawTextEditorPage`
exposes a `paste(target, ...)` helper that dispatches the document `paste`
event and then runs the recorded matchers, which mirrors Quill's synchronous
order.

## Risks / Trade-offs

- **Ordering dependency on Quill internals** (custom matchers run after style
  matchers) → Mitigation: pin the behavior to the CDN version already loaded
  (2.0.2) and keep the matcher logic tolerant: it deletes `background` and sets
  `color` regardless of whether the attribute exists.
- **Pasting into a code block** short-circuits Quill's HTML conversion to plain
  text, so no matcher runs; the result carries no background or color anyway.
  → No action needed.
- **Pasted images/files** bypass the text pipeline and are not normalized.
  → Out of scope, documented in the specs.
- **Orphaned legacy sessions** (`devtoolkit:sessions:text-editor:*`) remain in
  users' browsers, invisible to the gallery. → Accepted by the rename decision;
  keys are not deleted so reverting the change restores access.
- **Timer-scoped paste flag**: a paste that inserts nothing leaves the flag set
  until the timeout fires. → The timeout is scheduled in the same task as the
  paste, before any other user interaction can convert content.

## Migration Plan

1. Deploy the route, file, kind, and naming changes together; no server-side
   data or schema migration exists.
2. Old `/text-editor` links 404 immediately; `/editor` links keep working.
3. Rollback is the revert commit: the stored `text-editor` keys were never
   removed, so previously saved sessions reappear.
