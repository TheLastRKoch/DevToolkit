# Spec Delta

## MODIFIED Requirements

### Requirement: Every editor page offers the margin toggle

The raw text editor (`/raw-text-editor`), markdown editor (`/markdown-editor`),
and code editor (`/code-editor`) pages SHALL each list a `Toggle margins` option
in the shared Options dropdown. Selecting it SHALL flip the workspace margin
state, take effect immediately, and close the dropdown.

#### Scenario: The option is listed on each editor page

- **WHEN** the user opens `/raw-text-editor`, `/markdown-editor`, or
  `/code-editor` and activates the Options dropdown
- **THEN** `Toggle margins` is listed among that page's options

#### Scenario: Selecting the option flips the state

- **WHEN** the user selects `Toggle margins` with margins disabled
- **THEN** the editor workspace gains the side margins
- **AND** selecting `Toggle margins` again removes them
