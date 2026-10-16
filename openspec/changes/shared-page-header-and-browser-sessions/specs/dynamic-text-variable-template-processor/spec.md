# Spec Delta

## MODIFIED Requirements

### Requirement: Template sessions use isolated incremental routes

The application SHALL identify each browser template session with an incrementing numeric route such as `/template/1` and SHALL keep each session's variables and template state isolated in browser-local storage.

#### Scenario: Open a new session

- **WHEN** a user activates the new-session control
- **THEN** the application allocates the next session identifier in browser storage and opens a new browser tab at its corresponding `/template/<session-id>` route

#### Scenario: Keep sessions isolated

- **WHEN** a user edits variables or template text in one session
- **THEN** those changes do not alter the state rendered in another session

#### Scenario: Restore a routed session

- **WHEN** a user navigates directly to a valid `/template/<session-id>` route at any time after the server process has restarted
- **THEN** the application serves that session's template page and restores its stored state from browser storage, or initializes that session if it has no stored state or its stored state has expired

### Requirement: The template header controls the document title

The template interface SHALL display the shared page header's page-name textbox, and editing it SHALL update the page's HTML `document.title` and store the name on the current template session.

#### Scenario: Update the browser title

- **WHEN** a user changes the page-name textbox
- **THEN** the browser tab title changes to the input's current value

#### Scenario: Keep title edits session-scoped

- **WHEN** a user edits the title in one template session
- **THEN** the title state for another session is not changed

#### Scenario: Restore the title after reload

- **WHEN** a user reloads a template session after changing its page name
- **THEN** the page-name textbox and the browser tab title show the stored name
