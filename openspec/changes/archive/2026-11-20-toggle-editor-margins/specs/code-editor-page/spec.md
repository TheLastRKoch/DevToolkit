# Spec Delta

## MODIFIED Requirements

### Requirement: The code editor uses the shared header and page naming

The code editor page SHALL mount the shared page header with the title textbox
and Options dropdown, and SHALL NOT render its own page toolbar markup. The
Options dropdown SHALL contain exactly three actions: `Change language format`,
`Toggle margins`, and `Clear editor`. The page and its home page entry SHALL be
named `Code Editor`.

#### Scenario: Shared header is mounted

- **WHEN** the user opens `/code-editor`
- **THEN** the shared header renders the title textbox with placeholder
  `DevToolKit` and an Options dropdown containing `Change language format`,
  `Toggle margins`, and `Clear editor`

#### Scenario: Default page title

- **WHEN** the user opens the code editor without a stored title
- **THEN** `document.title` is `Devtoolkit`

#### Scenario: Home page entry

- **WHEN** the user opens the home page New dropdown
- **THEN** it contains a `Code Editor` entry that links to `/code-editor`
