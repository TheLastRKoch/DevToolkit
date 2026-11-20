# Spec Delta

## MODIFIED Requirements

### Requirement: Multiple sessions per page type with numeric IDs

Each page type (`raw-text-editor`, `markdown-editor`, `template`) SHALL store
any number of titled sessions. Every titled session SHALL have a unique numeric
ID within its page type and SHALL be stored at
`devtoolkit:sessions:<kind>:<id>`. Different page types SHALL never share state;
IDs MAY repeat across page types.

#### Scenario: Multiple sessions coexist

- **WHEN** the user saves two titled template sessions
- **THEN** both sessions are stored under distinct IDs and each keeps its own
  content

#### Scenario: IDs are scoped to the page kind

- **WHEN** a template session and a raw text editor session each receive ID `1`
- **THEN** both sessions exist independently at `/template/1` and
  `/raw-text-editor/1`

#### Scenario: Opening a page with no stored session

- **WHEN** the user opens `/<kind>` with no saved session selected
- **THEN** the page opens with an empty default state and an editable title
  textbox with placeholder "DevToolKit"

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

- **GIVEN** a raw-text-editor or markdown-editor session
- **THEN** each version contains `updatedDate` and `content`
- **GIVEN** a template session
- **THEN** each version contains `updatedDate`, `content`, and `variables`
- **GIVEN** a list-compare session
- **THEN** each version contains `updatedDate` and `content` storing List A and List B details
