# Tasks

## 1. Fix tab panel visibility in `selectTab()`

- [x] 1.1 In `public/static/scripts/template.js`, update `selectTab()` to toggle the `active` and `show` CSS classes on `#templatePanel` and `#variablesPanel` (in addition to the existing `hidden` attribute logic), so that Bootstrap 5's `.tab-content > .active { display: block }` rule correctly shows the active panel. Verify by loading the page in a browser, entering template text, clicking the Variables tab, and confirming `#variablesPanel` is visible and the textarea is not obscured.

## 2. Await sync before switching to Variables tab

- [x] 2.1 In `public/static/scripts/template.js`, convert the `variablesTab` click event listener to `async`, add `await syncPromise` before `selectTab('variables')` is called, call `renderVariables()` after the await (within a try/catch that routes errors to `showVariablesError()`), and ensure `selectTab('variables')` still runs even if the promise rejects. Verify by entering `@[one] @[two]` in the Template tab, immediately clicking the Variables tab, and confirming `@[one]=` and `@[two]=` appear in `#txtVariables`.

## 3. Integration verification

- [x] 3.1 Run `npm test` and confirm all 8 existing tests still pass with no modifications to server-side code.
- [x] 3.2 Manually verify the full variable round-trip: enter template text with `@[one]` and `@[two]`, switch to Variables, assign values (`@[one]=Hello`, `@[two]=World`), switch back to Template, focus the Output textarea, and confirm the rendered output reads `Hello World` with raw tokens replaced.
- [x] 3.3 Verify that switching between tabs multiple times does not duplicate variables or reset their values (covers the "Existing variables are preserved" scenario in the delta spec).
