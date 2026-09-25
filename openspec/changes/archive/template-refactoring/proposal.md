# Proposal

## Why

The template page currently provides only a basic text-editing surface and does not retain or render named variables across a session. Users also lack a way to identify a template in the browser, open isolated sessions, or avoid accidentally losing edits when leaving the page.

## What Changes

- Add an in-memory template session engine that detects `@[variable_name]` tokens, tracks unique case-sensitive variables, and supports variable CRUD operations.
- Render populated variables globally while preserving unassigned tokens in the output.
- Add clear-variables and clear-all state cleanup actions.
- Add incremental session routes and a new-session control that opens the next session in a browser tab.
- Add a top-left `Title` input that controls the page's HTML document title.
- Track edits to template text, variable values, and the document title and use `beforeunload` to show the native unsaved-changes confirmation.

## Capabilities

### New Capabilities

- `dynamic-text-variable-template-processor`: Detect, manage, render, and reset session-scoped template variables while providing session navigation, dynamic document titles, and unsaved-change protection.

### Modified Capabilities

None.

## Impact

- Updates the Express template route and static template-page HTML/client behavior.
- Adds session-scoped in-memory state and incremental `/template/<session-id>` routing without database persistence.
- Adds browser lifecycle handling for unsaved changes and a new-tab session workflow.
- No external API or persistent storage changes are required.
