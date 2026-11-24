# Design

## Context

See `proposal.md` - Why and `specs/editor-text-wrap/spec.md` for the required
behavior.

The two editors use different surfaces. The code editor renders a CodeMirror 6
view built in `public/static/scripts/code-editor-surface.js`, where wrapping is
an editor extension (the `EditorView.lineWrapping` facet), not a CSS style. The
raw text editor renders a Quill surface inside `#txtOutput`, where wrapping is
CSS (`white-space`) on Quill's `.ql-editor` element and both surfaces already
sit inside a workspace element (`#codeEditorWorkspace`, `#editorWorkspace`).

`public/static/scripts/editor-margins.js` already establishes the project
pattern for a page-level, non-persisted editor option: a classic UMD-style
module exposing a factory, state carried by a class on the workspace element,
and per-page wiring through the Options dropdown. The project has no bundler;
browser scripts are loaded as classic scripts and are also `require`-able from
`node --test`.

## Goals / Non-Goals

**Goals:**

- One shared implementation of the shortcut, the default-off state, and the
  "toggle does not touch content" guarantee, reused by both editors.
- A toggle that survives the two surface types without leaking CodeMirror or
  Quill details into the shared module.

**Non-Goals:**

- Adding an Options dropdown entry or any visible toolbar control. Issue #46
  specifies the keyboard shortcut only, and both pages have tests asserting
  their exact dropdown contents.
- Persisting the wrap preference across reloads, sessions, or pages.
- Reflowing or re-rendering content, and changing character counts, language
  detection, or line numbers.

## Decisions

- **A shared classic script owns the shortcut; each page supplies an
  `apply(enabled)` callback.** `editor-text-wrap.js` exposes
  `createTextWrapToggle({ workspace, apply })` with `run()`, `toggle()`, and
  `isEnabled()`, mirroring `editor-margins.js`. The code editor passes a
  callback that reconfigures its CodeMirror compartment; the raw text editor
  passes one that toggles a class on the workspace. Alternative rejected:
  duplicating keydown handling per page, which would let the default state or
  the "no content change" rule drift between editors.
- **Match the physical key, not the produced character.** On macOS, `Option+Z`
  reports `key: 'Ω'`, so the handler matches `event.code === 'KeyZ'` with
  `altKey` set and rejects `ctrlKey`/`metaKey`. Alternative rejected: matching
  `event.key === 'z'`, which would never fire on macOS.
- **Register the listener on `document` in the bubbling phase and call
  `preventDefault()`.** This keeps the shortcut working when focus is on the
  title box or the page body, and prevents the browser's own `Alt+Z` handling
  and any `z` insertion. CodeMirror binds no `Alt+Z` command by default, so its
  own keymap does not consume the event first.
- **The code editor reconfigures a wrapping compartment.** `code-editor-surface.js`
  adds a `Compartment` holding either `[]` or `EditorView.lineWrapping`, exposed
  as `setLineWrapping(enabled)`; this is the only editor-correct way to switch
  wrapping and it keeps existing extensions and history intact. Alternative
  rejected: a CSS `white-space` override, which CodeMirror's layout does not
  honor and which would break horizontal scrolling.
- **The raw text editor toggles a class on the workspace.** When wrapping is
  disabled the workspace gains `editor-text-wrap-disabled`, and page CSS sets
  Quill's `.ql-editor` to `white-space: pre` with horizontal overflow, so long
  lines extend and scroll. Alternative rejected: rewriting the HTML content with
  hard line breaks, which would corrupt the stored session.
- **State lives only in the DOM (class + compartment), like margins.** Every
  page load constructs the toggle in the disabled state, which satisfies the
  "never restored with stored content" requirement with no storage code.
- **No Options dropdown entry.** Keeping the dropdown lists unchanged avoids
  breaking the documented option sets and the tests that assert them; the
  shortcut is the requested interface.

## Risks / Trade-offs

- [The shortcut is not discoverable without a menu entry] → The tasks add the
  shortcut to `docs/pages.md`, and the shared module exports its constants so a
  future dropdown entry can reuse them without rework.
- [Some window managers or browser extensions reserve `Alt+Z`] → The page
  handles the event before default browser actions and the spec scopes the
  guarantee to the app's own pages; no alternative binding is added because the
  issue names this one.
- [Disabling wrapping in the raw text editor changes its default look] → This is
  the requested default; the empty editor and short lines look identical, and
  enabling wrapping restores Quill's usual reading layout.
- [A user toggling while text is selected could lose the selection] →
  Reconfiguring the CodeMirror compartment and toggling a CSS class both
  preserve editor state; tasks verify content, title, and character count are
  unchanged by the toggle.
