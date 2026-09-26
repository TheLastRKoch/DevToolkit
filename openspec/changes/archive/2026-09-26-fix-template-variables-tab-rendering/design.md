# Design

## Context

The template session editor in `public/static/scripts/template.js` manages two tab panels (`#templatePanel` and `#variablesPanel`) inside a Bootstrap 5 tab structure. Bootstrap hides all `.tab-pane` elements via `.tab-pane { display: none }` and reveals the active one via `.tab-content > .active { display: block }`. The current `selectTab()` function only toggles the HTML `hidden` attribute on panels and the `active` CSS class on tab _buttons_ — it never adds the `active` or `show` class to the panel elements themselves. As a result, Bootstrap's CSS rule always wins and keeps `#variablesPanel` invisible even after `hidden` is removed.

Additionally, the `variablesTab` click handler switches tabs synchronously, without awaiting `syncPromise`. Because variable synchronization is triggered by the template textarea's `blur` event (an async network request), the click handler may switch tabs before the server has responded and before `renderVariables()` has been called. Other event handlers in the same file (`output.focus`, `btnClearVariables.click`, `btnClearAll.click`) already `await syncPromise` before acting — the Variables tab click handler was omitted from that pattern.

See `proposal.md` — Why for full motivation.

## Goals / Non-Goals

**Goals:**
- Ensure `#variablesPanel` is correctly shown by Bootstrap when the Variables tab is selected, and hidden when the Template tab is selected.
- Ensure the Variables tab always displays up-to-date variable state by awaiting the in-flight `syncPromise` before revealing the panel.
- Match the `await syncPromise` pattern already used by other handlers in `template.js`.

**Non-Goals:**
- Changing Bootstrap version or removing Bootstrap as a dependency.
- Altering the server-side API, session model, or variable storage.
- Changing the tab UX design or layout in `template.html`.
- Rewriting the event model or the `render()` / `renderVariables()` functions.

## Decisions

**1. Toggle `.active` and `.show` on panel elements inside `selectTab()`**

Bootstrap 5's tab component manages visibility through the `active` class on `.tab-pane` elements (`.tab-content > .active { display: block }`). We add `classList.toggle('active', ...)` and `classList.toggle('show', ...)` to both `#templatePanel` and `#variablesPanel` inside `selectTab()`, alongside the existing `hidden` attribute logic. The `hidden` attribute is retained for accessibility (it removes the element from the accessibility tree when not in use); neither mechanism alone is sufficient — both are needed.

Alternative considered: Remove the `tab-pane` class from the panels to opt out of Bootstrap's hiding. Rejected: this changes HTML semantics and could break future Bootstrap upgrades or other CSS that targets `.tab-pane`.

Alternative considered: Override Bootstrap's CSS with a custom rule to prevent `.tab-pane { display: none }` from applying. Rejected: a CSS override is more fragile and harder to understand than correctly following Bootstrap's component contract.

**2. Make `variablesTab` click handler `async` and `await syncPromise` before switching**

The `blur` event on `#txtInput` fires and starts an async `PATCH` request (`syncPromise`) before the click on `#variablesTab` is processed. By `await`-ing `syncPromise` at the top of the click handler, we guarantee the server has responded and `state` is current before `renderVariables()` is called, matching the pattern used by `output.focus`, `btnClearVariables`, and `btnClearAll`. If the promise rejects, the error is shown via the existing `showVariablesError()` function, and `selectTab('variables')` still runs so the tab switch completes.

Alternative considered: Trigger `syncPromise` synchronously in the click handler rather than relying on blur. Rejected: re-triggering the request would cause a double PATCH; the blur event already initiates it and `syncPromise` is the correct signal to await.

## Risks / Trade-offs

- [Risk] If `syncPromise` is slow (network latency), the Variables tab click appears to lag before opening. → Mitigation: The existing `syncPromise = Promise.resolve()` initial value ensures no delay on the very first click. Subsequent clicks may have a brief delay, but this matches the intentional design that variables are always up-to-date with the server before being shown.
- [Risk] A future refactor removes the `tab-pane` class from panels, making the `classList.toggle('active', ...)` calls a no-op. → Mitigation: The `hidden` attribute toggle already provides a fallback; the fix is additive, not a replacement.

## Migration Plan

Deploy `public/static/scripts/template.js` in a single commit. No server changes, no database migration, no HTML changes. The fix is purely client-side JavaScript and is immediately live on next page load.
