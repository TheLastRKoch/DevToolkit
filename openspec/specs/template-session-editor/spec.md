# template-session-editor Specification

## Purpose

Provides a focused template-session editor where session controls and editing
surfaces are grouped together, while variable creation follows the user's
explicit transition into variable editing.

## Requirements

### Requirement: Session controls are grouped outside the navbar

The template session page SHALL render the shared page header row below the
navbar, containing the Options dropdown with the Clear variables and Clear all
actions, and the title textbox, and SHALL NOT render the title textbox or any of
those actions in the navbar.

#### Scenario: User sees session controls

- **WHEN** the user opens a template session
- **THEN** the Options dropdown and the title textbox are visible in one header
  row outside the navbar

#### Scenario: User reaches the session actions

- **WHEN** the user activates the Options dropdown on a template session
- **THEN** Clear variables and Clear all are listed as dropdown items
- **AND** selecting one runs that session action

#### Scenario: Title is edited in the header row

- **WHEN** the user edits the title textbox in the header row
- **THEN** the browser tab title changes to the entered value

### Requirement: Template and variables use tabs

The template session page SHALL present Template and Variables as two tabs
within one shared editor section, with Template selected initially, while the
rendered output remains available as a separate editing result. When the user
selects the Variables tab, the Variables panel SHALL become fully visible and
the Template editor SHALL be hidden. When the user selects the Template tab,
the Template editor SHALL become fully visible and the Variables panel SHALL be
hidden. The panel display state SHALL be governed by both the CSS framework's
active-panel mechanism and any HTML visibility attributes, so that removing a
`hidden` attribute alone is sufficient to make the panel visible regardless of
any CSS rule that hides inactive tab panes by default.

#### Scenario: Template tab is initially selected

- **WHEN** the user opens a template session
- **THEN** the Template tab is selected and the template editor is visible
- **AND** the Variables panel is not simultaneously displayed as a separate
  section

#### Scenario: User switches to Variables tab — panel is visible

- **WHEN** the user selects the Variables tab
- **THEN** the Variables panel is shown and the Template editor is hidden
- **AND** the Variables panel content (the variables text area) is visible and
  not obscured by any CSS `display: none` rule

#### Scenario: User switches to Template tab — panel is visible

- **WHEN** the user selects the Template tab after viewing Variables
- **THEN** the Template editor is shown and the Variables panel is hidden

### Requirement: Variable creation is deferred until entering Variables

The system SHALL NOT add newly detected template tokens to a session's
variables solely because the user types or saves template text, loads or reads
the session, or remains on the Template tab. The system SHALL add newly
detected tokens and render current variable state in the Variables panel when
the user switches from the Template tab to the Variables tab, after which those
variables SHALL be available for editing and rendering. The system SHALL
complete any pending variable synchronization with the server before displaying
the Variables panel so that the panel always reflects the current token state
of the template at the moment the tab is opened.

#### Scenario: Typing a new token does not immediately create a variable

- **WHEN** the user enters a previously unseen valid token while the Template
  tab is active
- **THEN** the token is not added to the session's variables yet
- **AND** the Variables tab does not show that token until the user enters it

#### Scenario: Entering Variables creates pending variables and displays them

- **WHEN** the user switches from the Template tab to the Variables tab
- **THEN** the system completes synchronization of the template text with the
  server before the Variables panel becomes visible
- **AND** each valid token in the current template that is not already a
  variable is added with an empty value
- **AND** the Variables panel displays all current variables including any
  newly created ones

#### Scenario: Existing variables are preserved

- **WHEN** the user enters the Variables tab after editing a template
- **THEN** existing variable values are preserved
- **AND** repeated switches to the Variables tab do not duplicate variables or
  reset their values

#### Scenario: Invalid token text is ignored

- **WHEN** the current template contains text that does not match the supported
  variable-token format
- **THEN** switching to the Variables tab does not create a variable for that
  text
