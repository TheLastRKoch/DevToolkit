# template-session-editor Specification

## Purpose

Provides a focused template-session editor where session controls and editing
surfaces are grouped together, while variable creation follows the user's
explicit transition into variable editing.

## Requirements

### Requirement: Session controls are grouped outside the navbar

The template session page SHALL render the title field, New session button,
Clear variables button, and Clear all button together in the session controls
area below the navbar, and SHALL NOT render the title field or New session
button in the navbar.

#### Scenario: User sees session controls

- **WHEN** the user opens a template session
- **THEN** the title field, New session, Clear variables, and Clear all controls
  are visible in one controls area outside the navbar

### Requirement: Template and variables use tabs

The template session page SHALL present Template and Variables as two tabs
within one shared editor section, with Template selected initially, while the
rendered output remains available as a separate editing result.

#### Scenario: Template tab is initially selected

- **WHEN** the user opens a template session
- **THEN** the Template tab is selected and the template editor is visible
- **AND** the Variables panel is not simultaneously displayed as a separate
  section

#### Scenario: User switches between editor tabs

- **WHEN** the user selects the Variables tab
- **THEN** the Variables panel is shown and the Template editor is hidden
- **WHEN** the user selects the Template tab
- **THEN** the Template editor is shown and the Variables panel is hidden

### Requirement: Variable creation is deferred until entering Variables

The system SHALL NOT add newly detected template tokens to a session's
variables solely because the user types or saves template text, loads or reads
the session, or remains on the Template tab. The system SHALL add newly
detected tokens when the user switches from the Template tab to the Variables
tab, after which those variables SHALL be available for editing and rendering.

#### Scenario: Typing a new token does not immediately create a variable

- **WHEN** the user enters a previously unseen valid token while the Template
  tab is active
- **THEN** the token is not added to the session's variables yet
- **AND** the Variables tab does not show that token until the user enters it

#### Scenario: Entering Variables creates pending variables

- **WHEN** the user switches from the Template tab to the Variables tab
- **THEN** each valid token in the current template that is not already a
  variable is added with an empty value
- **AND** the Variables panel displays the newly created variables

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
