# Spec Delta

## MODIFIED Requirements

### Requirement: Template sessions use isolated incremental routes

The application SHALL store the template session's variables and template state in browser-local storage at `devtoolkit:sessions:template`, isolated from other page sessions. Persistence SHALL be conditional on the user providing a valid custom title.

#### Scenario: Open a new session

- **WHEN** a user accesses the template session
- **THEN** the application maintains a single browser-local session for the template page

#### Scenario: Keep sessions isolated

- **WHEN** a user edits variables or template text in the template session
- **THEN** those changes do not alter the state rendered in other page sessions

#### Scenario: Restore a routed session

- **WHEN** a user navigates to `/template` at any time after the server process has restarted
- **THEN** the application serves the template page and restores its stored state from browser storage if a valid titled session exists, or initializes an empty session if no stored state is found

### Requirement: The template header controls the document title

The template interface SHALL display the shared page header's title textbox with placeholder "DevToolKit", and editing it SHALL update the page's HTML `document.title` and store the title on the current template session when valid. Once the title textbox loses focus with a valid title, the title input SHALL be disabled.

#### Scenario: Update the browser title

- **WHEN** a user changes the title textbox
- **THEN** the browser tab title changes to the input's current value

#### Scenario: Keep title edits session-scoped

- **WHEN** a user edits the title in the template session
- **THEN** the title state for other page sessions is not changed

#### Scenario: Restore the title after reload

- **WHEN** a user reloads a template session after saving a valid title
- **THEN** the title textbox shows the stored title (disabled) and the browser tab title shows the stored title

### Requirement: The application warns before losing unsaved changes

The application SHALL track edits to template text, variable values, and the document title. When the template session has no valid custom title and the session is dirty, the application SHALL register a browser `beforeunload` handler that requests the native unsaved-changes confirmation. A titled session SHALL NOT trigger `beforeunload` because its content is versioned automatically on navigate-away.

#### Scenario: Warn when closing or leaving with edits

- **WHEN** a user closes, refreshes, or navigates away from an untitled template session after making an unsaved edit
- **THEN** the browser receives a `beforeunload` request and displays its native confirmation prompt, such as `Leave site? Changes you made may not be saved.`

#### Scenario: Do not warn when clean

- **WHEN** a user leaves an untitled template session without changing template text, variables, or the title
- **THEN** the application does not request a `beforeunload` confirmation

#### Scenario: Track all supported edit sources

- **WHEN** the user changes template text, a variable value, or the title input
- **THEN** the active session becomes dirty until its state is cleared or otherwise saved according to the application's session behavior

#### Scenario: Titled session does not warn

- **WHEN** a user leaves a titled template session (modified or not)
- **THEN** the application does not request a `beforeunload` confirmation
