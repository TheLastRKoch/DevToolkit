# Spec Delta

## ADDED Requirements

### Requirement: Multiple sessions per page type with numeric IDs

Each page type (`text-editor`, `markdown-editor`, `template`) SHALL store any
number of titled sessions. Every titled session SHALL have a unique numeric ID
within its page type and SHALL be stored at
`devtoolkit:sessions:<kind>:<id>`. Different page types SHALL never share state;
IDs MAY repeat across page types.

#### Scenario: Multiple sessions coexist

- **WHEN** the user saves two titled template sessions
- **THEN** both sessions are stored under distinct IDs and each keeps its own
  content

#### Scenario: IDs are scoped to the page kind

- **WHEN** a template session and a text editor session each receive ID `1`
- **THEN** both sessions exist independently at `/template/1` and
  `/text-editor/1`

#### Scenario: Opening a page with no stored session

- **WHEN** the user opens `/<kind>` with no saved session selected
- **THEN** the page opens with an empty default state and an editable title
  textbox with placeholder "DevToolKit"

### Requirement: Numeric session IDs are allocated per kind

The application SHALL allocate the next numeric ID for a page kind from a
monotonic per-kind counter stored in browser storage. An ID SHALL NOT be reused
after its session is deleted. The counter SHALL be scoped to the page kind.

#### Scenario: First saved session gets ID 1

- **WHEN** the user saves the first titled template session
- **THEN** it receives ID `1` and is stored at `devtoolkit:sessions:template:1`

#### Scenario: Next saved session gets the next ID

- **WHEN** the user saves another titled template session after ID `1`
- **THEN** it receives ID `2`

#### Scenario: Deleted IDs are not reused

- **WHEN** the session with the highest ID is deleted and a new session is saved
- **THEN** the new session receives a new higher ID

### Requirement: A new session receives its ID on first title save

A fresh session SHALL remain untitled and unstored while it has no valid title.
When the user first saves a valid title, the application SHALL allocate the next
per-kind numeric ID, store the session under that ID, and replace the current URL
with `/<kind>/<id>` without reloading the page.

#### Scenario: URL gains the ID after the first title save

- **WHEN** the user opens `/<kind>`, enters a valid title, and leaves the title
  textbox
- **THEN** the session is stored under the next numeric ID
- **AND** the browser URL becomes `/<kind>/<id>`

#### Scenario: Untitled new session keeps the ID-less URL

- **WHEN** the user edits an untitled session at `/<kind>` and does not provide a
  valid title
- **THEN** no session is stored and the URL remains `/<kind>`

### Requirement: Existing single-session data migrates to ID 1

On first access after this change, the application SHALL migrate a valid legacy
session stored at `devtoolkit:sessions:<kind>` to
`devtoolkit:sessions:<kind>:1`, advance the per-kind counter past the migrated
ID, and remove the legacy key. Migration SHALL be idempotent.

#### Scenario: Legacy session appears as ID 1

- **WHEN** the user has a titled legacy template session and opens the gallery or
  the template page
- **THEN** the session is available at `/template/1`

#### Scenario: Migration runs once

- **WHEN** the migrated session already exists at ID 1
- **THEN** the application does not create a duplicate or advance the counter
  again

### Requirement: An unknown session ID opens an empty session

When the user opens `/<kind>/<id>` and no stored session exists for that ID, the
page SHALL open an empty, untitled session bound to that ID. Saving a valid title
SHALL store it at that ID.

#### Scenario: Unknown ID opens empty

- **WHEN** the user opens `/template/99` and no template session 99 exists
- **THEN** the page opens with empty template text and variables and an editable
  title

## REMOVED Requirements

### Requirement: Single session per page type

**Reason**: Replaced by multiple ID-addressed sessions per page type.

**Migration**: Existing data at `devtoolkit:sessions:<kind>` is migrated to
`devtoolkit:sessions:<kind>:1` on first access.
