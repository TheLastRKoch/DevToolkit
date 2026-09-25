# Tasks

## 1. Session routing and in-memory state

- [x] 1.1 Add an in-memory session store for numeric template session IDs containing template text, title, and variable values, and verify independent sessions do not share state.
- [x] 1.2 Extend the Express routes to serve `/template` and `/template/<session-id>` safely, allocate the next session ID for new sessions, and verify direct valid and invalid route behavior.
- [x] 1.3 Add the new-session endpoint or equivalent allocation flow and verify the client opens the allocated `/template/<session-id>` route in a new browser tab.

## 2. Template processing and rendering

- [x] 2.1 Implement token extraction using `@\[([a-zA-Z0-9_-]+)\]`, preserving case sensitivity and ignoring invalid or space-containing tokens, and verify duplicate and invalid-token cases.
- [x] 2.2 Implement session variable retrieval, filled/empty filtering, set/update, and delete operations, and verify a value update affects every matching occurrence in the active template.
- [x] 2.3 Implement rendered output with global replacement for non-empty values and raw-token fallback for empty or unassigned variables, and verify mixed populated and unpopulated templates.
- [x] 2.4 Wire Clear Variables and Clear All actions to session state and template input, and verify each operation leaves the required state.

## 3. Template interface and browser lifecycle

- [x] 3.1 Add the top-left `Title` input and adjacent new-session control to the template header, and verify the controls are accessible and visible on the template page.
- [x] 3.2 Bind the Title input to the active session and `document.title`, and verify title edits remain isolated between sessions.
- [x] 3.3 Track dirty state for template text, variable values, and title edits and add a conditional `beforeunload` handler, verifying clean pages do not prompt and dirty pages request the native confirmation.
- [x] 3.4 Update client-side documentation or usage guidance for session URLs, title editing, variable behavior, and unsaved-change protection, and verify the documented workflow matches the UI.

## 4. Integration verification

- [x] 4.1 Run the project’s available validation commands and exercise an end-to-end session covering extraction, editing, rendering, clearing, title updates, new-tab routing, and unload protection.
