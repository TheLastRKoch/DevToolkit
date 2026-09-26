# Proposal

## Why

When a user types template text with variables (e.g., `@[one] @[two]`) and then clicks the **Variables** tab, the variables panel is not displayed due to two compounding bugs: Bootstrap's `.tab-pane { display: none }` CSS overrides the HTML `hidden` attribute removal, and the Variables tab click handler does not await the in-flight variable synchronization promise before switching tabs. Both bugs together prevent the variables panel from ever being visible or populated when switching tabs.

## What Changes

- Fix `selectTab()` in `public/static/scripts/template.js` to also toggle Bootstrap's `active` and `show` CSS classes on the tab pane panel elements (not just the tab buttons), so the Variables panel is correctly shown by Bootstrap when selected.
- Update the `variablesTab` click event listener to be `async` and to `await syncPromise` before calling `renderVariables()` and switching tabs, matching the pattern already used by other event handlers (`output.focus`, `btnClearVariables.click`, `btnClearAll.click`).

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `template-session-editor`: The requirement that "the Variables panel is shown and the Template editor is hidden" when the user selects the Variables tab is currently broken in implementation. This change restores correct tab visibility and ensures variables are rendered when the tab is opened.

## Impact

- `public/static/scripts/template.js`: Two targeted changes to `selectTab()` and the `variablesTab` click listener.
- `public/template.html`: No structural changes required.
- No server-side changes.
- No API or data model changes.
- All existing tests continue to pass; a new browser-behavior regression test should be added to confirm the fix.
