# dynamic-text-variable-template-processor Specification

## Purpose

This capability provides session-scoped template editing for the static web application, including dynamic variable extraction and rendering, isolated browser sessions, editable document titles, and protection against losing unsaved changes.

## Requirements

### Requirement: The application extracts and manages template variables

The application SHALL detect tokens matching `@\[([a-zA-Z0-9_-]+)\]` in the active template, register each unique token in session memory, and treat variable names as case-sensitive.

#### Scenario: Extract unique variables

- **WHEN** a user enters template text containing one or more valid `@[variable_name]` tokens
- **THEN** the application registers each unique token in the active session and exposes the variables for editing

#### Scenario: Preserve case distinctions

- **WHEN** a template contains both `@[Person]` and `@[person]`
- **THEN** the application treats them as two separate variables

#### Scenario: Reject invalid variable names

- **WHEN** text contains a token with spaces or characters outside letters, numbers, underscores, and hyphens inside the brackets
- **THEN** the application does not register that token as a variable

#### Scenario: Manage session variables

- **WHEN** a user views, sets, updates, or deletes a variable
- **THEN** the application provides the current session's complete, filled, empty, and modified variable states without persisting them to a database

### Requirement: The application renders populated templates

The application SHALL replace every occurrence of a filled variable with its current value and SHALL preserve the raw token for variables that are empty or unassigned.

#### Scenario: Render a filled variable globally

- **WHEN** a variable has a non-empty value and appears multiple times in the template
- **THEN** every occurrence is replaced with that value in the rendered output

#### Scenario: Preserve an unassigned variable

- **WHEN** a variable has no value or an empty value
- **THEN** its `@[variable_name]` token remains unchanged in the rendered output

### Requirement: The user can clear template session state

The application SHALL provide separate operations to clear all variable keys and values, or to clear both variable state and the active template input.

#### Scenario: Clear variables

- **WHEN** a user selects Clear Variables
- **THEN** all variables and their values are removed from the active session while the template input remains

#### Scenario: Clear all

- **WHEN** a user selects Clear All
- **THEN** the active session's variables are removed and the template input text is emptied

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
