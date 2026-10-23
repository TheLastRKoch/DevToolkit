# Spec Delta

## MODIFIED Requirements

### Requirement: Version history keeps the last three snapshots

Each titled session SHALL maintain a `versions` array of at most 3 content
snapshots. When the user navigates away from the tab or window (page unload, tab
switch, or visibility change), the application SHALL create a snapshot of the
current content and push it to the array. If the array would exceed 3 entries,
the oldest entry SHALL be dropped (FIFO).

#### Scenario: First version is created on navigate-away

- **WHEN** the user provides a valid title, edits content, and navigates away
- **THEN** a version snapshot with the current content and an ISO-8601
  `updatedDate` is created in the `versions` array

#### Scenario: Fourth version drops the oldest

- **WHEN** the session has 3 versions and the user navigates away with changed
  content
- **THEN** the oldest version is dropped and the new version is added, keeping
  the array at 3 entries

#### Scenario: Version contents by page type

- **GIVEN** a text-editor or markdown-editor session
- **THEN** each version contains `updatedDate` and `content`
- **GIVEN** a template session
- **THEN** each version contains `updatedDate`, `content`, and `variables`
- **GIVEN** a list-compare session
- **THEN** each version contains `updatedDate` and `content` storing List A and List B details

### Requirement: Session lifecycle actions update browser state

Each page's session actions SHALL update only browser-stored state. Clear editor
SHALL empty the page's editable content while keeping the title. Clear variables
SHALL remove all variable values while keeping the template text. Clear all SHALL
empty the page's editable content and variable values, keeping the title.

#### Scenario: Clear editor

- **WHEN** the user selects Clear editor
- **THEN** the editor content becomes empty
- **AND** the title is unchanged

#### Scenario: Clear variables

- **WHEN** the user selects Clear variables on the template page
- **THEN** all variable values are removed
- **AND** the template text is preserved

#### Scenario: Clear all

- **WHEN** the user selects Clear all on the template page
- **THEN** the template text and all variables are emptied

#### Scenario: Clear all on list compare

- **WHEN** the user selects Clear all on the list compare page
- **THEN** the List A and List B text boxes and results are emptied while the title is preserved
