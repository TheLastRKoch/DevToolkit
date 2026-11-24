# Proposal

## Why

Long lines in the code and raw text editors are hard to read when they are
always wrapped, and hard to scan when they are always clipped. Users expect the
familiar editor shortcut for switching between the two, so they can choose per
session without leaving the keyboard.

Issue #46 asks for a text wrap toggle bound to `Alt+Z` (Windows/Linux) and
`Option+Z` (macOS) on `/code-editor` and `/raw-text-editor`, disabled by
default.

## What Changes

- Add a text wrap toggle to the code editor (`/code-editor`) and raw text editor
  (`/raw-text-editor`), bound to `Alt+Z` on Windows/Linux and `Option+Z` on
  macOS.
- Start every page load with text wrap disabled, so long lines extend
  horizontally and the editor scrolls instead of wrapping.
- Consume the shortcut while the page has focus so it never inserts a `z`, never
  reaches the browser, and works the same whether or not the editing surface has
  focus.
- Leave content, title, stored session versions, line numbers, and the Options
  dropdown unchanged by the toggle; the wrap state is purely presentational and
  is not persisted across reloads or pages.

## Capabilities

### New Capabilities

- `editor-text-wrap`: the keyboard-driven text wrap toggle shared by the code
  and raw text editors, including its default-off behavior, its scope, and the
  guarantee that it does not alter editor content or stored sessions.

### Modified Capabilities

<!-- None: the toggle adds a new shared behavior and does not change any
     documented requirement of `code-editor-page` or another existing
     capability. -->

## Impact

- `public/static/scripts/editor-text-wrap.js` (new): shared, testable module
  that binds the shortcut and applies the wrap state to a target surface.
- `public/static/scripts/code-editor-surface.js`: expose a way to reconfigure
  the CodeMirror surface's line wrapping.
- `public/static/scripts/code-editor.js` and
  `public/static/scripts/raw-text-editor.js`: wire the shared toggle to their
  editing surface.
- `public/code-editor.html` and `public/raw-text-editor.html`: load the shared
  script and carry the wrap styling hook for the editing surface.
- `test/`: unit coverage for the shared module plus page coverage on both
  editors for the shortcut, the default state, and content isolation.
- `docs/pages.md`: document the shortcut and the default-off behavior.
