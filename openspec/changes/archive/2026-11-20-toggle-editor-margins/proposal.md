# Proposal

## Why

The editor pages currently spend 400px of horizontal space on hardcoded side
margins: `/markdown-editor` and `/code-editor` apply `margin-left: 200px;
margin-right: 200px` to their workspace above 768px and offer no way to turn it
off, while `/text-editor` has no equivalent workspace framing. Users who want
the full width of a wide or narrow desktop viewport cannot reclaim that space,
and the three editors do not behave consistently.

## What Changes

- Add a `Toggle margins` option to the shared Options dropdown on `/text-editor`,
  `/markdown-editor`, and `/code-editor`. Selecting it flips the editor workspace
  between a 200px left/right inset and no inset at viewport widths of 768px and
  above, with immediate visual effect.
- Default the margins to **disabled**: every page load starts with no side
  margins. The setting is not persisted across reloads, sessions, or pages.
- Stop applying the 200px margins unconditionally in
  `public/markdown-editor.html` and `public/code-editor.html`; margins only
  apply while the toggle is on.
- Give `/text-editor` a workspace container so it participates in the same
  margin behavior and stays vertically separated from the page header.
- Update the page scripts, page markup, and tests that enumerate each editor's
  dropdown options.

## Capabilities

### New Capabilities

- `editor-workspace-margins`: Defines the margin toggle shared by the text,
  markdown, and code editor pages: where it appears, its default state, the
  200px inset it applies, and its page-load-only lifetime.

### Modified Capabilities

- `code-editor-page`: The Options dropdown currently requires exactly
  `Change language format` and `Clear editor`; it now also offers
  `Toggle margins`.
- `shared-page-header`: The per-page option inventory for the text, markdown,
  and code editor pages now includes `Toggle margins` alongside their existing
  actions.

## Impact

- `public/text-editor.html`, `public/markdown-editor.html`,
  `public/code-editor.html`: workspace markup and margin CSS driven by a state
  class instead of an unconditional media-query rule.
- `public/static/scripts/text-editor.js`, `markdown-editor.js`,
  `code-editor.js`: register the `Toggle margins` option and apply or remove the
  margin state class on the page's workspace.
- `test/text-editor-page.test.js`, `test/markdown-editor-page.test.js`,
  `test/markdown-editor.test.js`, `test/code-editor-page.test.js`,
  `test/page-integration.test.js`: updated option lists and new toggle-state
  assertions.
- No server, routing, or stored-session schema changes; existing saved sessions
  load unchanged.
