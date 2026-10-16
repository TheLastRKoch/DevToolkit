# Spec Delta

## MODIFIED Requirements

### Requirement: Session controls are grouped outside the navbar

The template session page SHALL render the shared page header row below the
navbar, containing the breadcrumb, the Options dropdown with the New session,
Clear variables, and Clear all actions, and the page-name textbox, and SHALL NOT
render the page-name textbox or any of those actions in the navbar.

#### Scenario: User sees session controls

- **WHEN** the user opens a template session
- **THEN** the breadcrumb, the Options dropdown, and the page-name textbox are
  visible in one header row outside the navbar

#### Scenario: User reaches the session actions

- **WHEN** the user activates the Options dropdown on a template session
- **THEN** New session, Clear variables, and Clear all are listed as dropdown
  items
- **AND** selecting one runs that session action

#### Scenario: Page name is edited in the header row

- **WHEN** the user edits the page-name textbox in the header row
- **THEN** the browser tab title changes to the entered value
