# Spec Delta

## MODIFIED Requirements

### Requirement: Template sessions use isolated incremental routes

The application SHALL store each template session's variables and template
state in browser-local storage at `devtoolkit:sessions:template:<id>`, isolated
from other template sessions and other page kinds. Persistence SHALL be
conditional on the user providing a valid custom title.

#### Scenario: Open a new session

- **WHEN** a user accesses `/template`
- **THEN** the application starts a fresh untitled template session

#### Scenario: Keep sessions isolated

- **WHEN** a user edits variables or template text in one template session
- **THEN** other template sessions and other page kinds keep their own state

#### Scenario: Restore a routed session

- **WHEN** a user navigates to `/template/<id>` after the server process restarts
- **THEN** the application serves the template page and restores that session's
  stored template text and variables if it exists
