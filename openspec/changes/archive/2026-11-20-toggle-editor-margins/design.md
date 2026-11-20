# Design

## Context

See `proposal.md` for motivation and `specs/editor-workspace-margins/spec.md` for the
requirements.

Current state:

- `public/markdown-editor.html` and `public/code-editor.html` each hardcode
  `#editorWorkspace` / `#codeEditorWorkspace` with
  `@media (min-width: 768px) { margin-left: 200px; margin-right: 200px; }`.
- `/text-editor` has no workspace container; its Quill surface sits in
  `<div class="row flex-grow-1 main-content mt-3"><div class="col-md-12 ...">`.
- Each page script builds its own Options array and passes it to
  `DevToolkitPageHeader.initPageHeader` (`public/static/scripts/page-header.js`).
  The header renders whatever options it is given; it has no notion of checkable
  or stateful items.
- Tests drive the page scripts through a mock DOM (`test/helpers/mock-dom.js`)
  that supports `classList` but not computed styles, and several tests assert the
  literal 200px media-query rule in the HTML.

## Goals / Non-Goals

**Goals:**

- One margin behavior shared by the three editor pages, expressed so a state class
  on the workspace element drives the layout.
- Keep the existing vertical layout (`mt-3`, fixed-height workspaces, pane
  sizing) untouched.
- Make the toggle testable with the existing mock DOM and page harnesses.

**Non-Goals:**

- Persisting the preference anywhere (localStorage, session store, URL).
- Making the Options dropdown aware of toggle state beyond running the action
  (no checkmark rendering, no header API changes).
- Reworking the text editor's inner layout or its fixed `#txtOutput` height.

## Decisions

### State lives in a class on the workspace element

Add a shared CSS rule to each editor page:

```css
@media (min-width: 768px) {
    #editorWorkspace.editor-margins-enabled,
    #codeEditorWorkspace.editor-margins-enabled {
        margin-left: 200px;
        margin-right: 200px;
    }
}
```

The page removes the unconditional margin rule, so a fresh load (no class) has no
inset, and `classList.toggle('editor-margins-enabled')` flips the layout with no
reflow of the inner panes.

Alternatives considered:

- **Inline `style.marginLeft`**: rejected because the 200px inset would apply on
  mobile too; the responsive breakpoint would have to be re-implemented in JS.
- **Class on `<body>`**: works, but couples the rule to every nested selector and
  makes the workspace the state owner less obvious. The workspace already owns
  the margin, so it owns the class.

### A small shared module creates the option

New `public/static/scripts/editor-margins.js` follows the existing UMD factory
pattern (`browser-session.js`, `page-header.js`) so it can be loaded as a classic
script and required from Node tests. It exports:

- `MARGIN_CLASS` — `editor-margins-enabled`.
- `createMarginToggle(workspace)` — returns an option descriptor
  `{ id: 'toggle-margins', label: 'Toggle margins', run }` plus
  `isEnabled()`, or `null` when no workspace element exists.

Each page script declares the dropdown entry in its own Options array and
delegates the handler to the shared module, keeping the label next to the page's
other options:

```js
options: [
    ...(marginOption ? [{ id: 'toggle-margins', label: 'Toggle margins', run: marginOption.run }] : []),
    { id: 'clear-editor', label: 'Clear editor', run: clearEditor },
],
```

and `editor-margins.js` is loaded before the page script in the three HTML files.

Alternatives considered:

- **Duplicating three near-identical toggle functions**: smaller diff, but three
  copies of the class name and label drift apart. The repo already centralizes
  cross-page behavior in shared scripts.
- **Extending `page-header.js` with a checkable option type**: would touch every
  page's option contract for one page family's need; the header's plain action
  model is sufficient.

### The text editor gets a workspace wrapper

`public/text-editor.html` wraps its existing row/column block in
`<div id="editorWorkspace" ...>`. The wrapper only carries margin/elevation
classes (no fixed height), leaving `#txtOutput`'s inline height and the Quill
layout unchanged. This makes the ID and behavior identical to the markdown page
and gives the text editor the same visual frame when margins are enabled.

## Risks / Trade-offs

- [Removing the always-on margins changes the default look of both existing
  editors] → Intended by the request; specs record the new default and tests
  assert the class is absent on load.
- [The text editor wrapper changes the DOM around a fixed-height Quill surface
  and could disturb the existing page integration test] → Wrapper adds no height
  or display rules, only margin classes; the integration test asserts the header
  and script wiring, not the wrapper.
- [Mock DOM has no computed styles, so tests cannot read a resolved margin] →
  Tests assert the state class plus the scoped CSS rule in the HTML, matching how
  the existing layout tests assert markup.
- [Duplicate 200px values across three pages] → The class-based rule keeps the
  JS single-sourced; the CSS repeats one 4-line block per page, consistent with
  the current per-page stylesheet pattern.

## Migration Plan

Static client-side change; no server or data migration. Sessions saved under the
existing kinds and IDs load unchanged. Rollback is reverting the page HTML, the
three page scripts, the shared script, and the tests.
