# Spec Delta

## MODIFIED Requirements

### Requirement: Template and variables use tabs

The template session page SHALL present Template and Variables as two tabs within one shared editor section, with Template selected initially, and SHALL display the rendered output text box alongside the editor section covering the remaining width of the screen equal to the template and variables section.

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

#### Scenario: Output text box covers remaining screen width

- **WHEN** the template session page is rendered
- **THEN** the template/variables editor column and the output text box column each span half of the content row
- **AND** no unoccupied grid columns remain in the row

## REMOVED Requirements

### Requirement: Variable creation is deferred until entering Variables
**Reason**: Replaced by template blur-triggered variable synchronization and multi-line variable editing.
**Migration**: Variable synchronization is now triggered when the template text box loses focus, and variables are edited directly in a formatted text box.

## ADDED Requirements

### Requirement: Variables are rendered and edited in a single formatted text box

The Variables tab SHALL render session variables inside a single multi-line text box instead of individual labels and text inputs. Each variable SHALL be represented on its own line using the format `@[variable-name]=variable content`. Parsing the text box SHALL update the session's stored variables.

#### Scenario: Variables displayed in multi-line format

- **WHEN** the user views the Variables tab with active session variables
- **THEN** all session variables appear in a single textarea
- **AND** each variable is formatted as `@[variable-name]=variable content` on its own line
- **AND** empty variables are formatted as `@[variable-name]=`

#### Scenario: Editing variables in text box updates session state

- **WHEN** the user modifies variable definitions in the variables text box and blurs the input
- **THEN** the key-value pairs are parsed from the `@[variable-name]=variable content` format
- **AND** the session's variable values are updated and persisted

### Requirement: Variable synchronization is triggered on template blur

The application SHALL add new variables and synchronize existing variables when the template text box loses focus (focus off / blur). The system SHALL NOT add new variables while the user is actively typing inside the template text box.

#### Scenario: Blur triggers variable addition and update

- **WHEN** the user finishes editing the template text box and removes focus from it
- **THEN** each newly detected valid token in the template is added to session variables with an empty value
- **AND** existing variable values are preserved
- **AND** the variables text box is updated with the current variable list

#### Scenario: Typing in template does not trigger variable addition

- **WHEN** the user types new tokens in the template text box while maintaining focus
- **THEN** the session variables are not updated with the new tokens until focus is lost

### Requirement: Template rendering is triggered on output focus

The application SHALL render the populated template into the output text box when the output text box receives focus (focus on). The system SHALL replace populated variables with their values and preserve unassigned tokens.

#### Scenario: Output focus triggers rendering

- **WHEN** the user focuses on the output text box
- **THEN** the application renders the active template text using current variable values
- **AND** the rendered result is displayed in the output text box

#### Scenario: Preserving unassigned tokens on output focus

- **WHEN** the user focuses on the output text box and some template variables have empty values
- **THEN** unassigned tokens remain in raw `@[variable-name]` format in the rendered output
