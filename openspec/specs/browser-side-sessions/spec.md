# browser-side-sessions Specification

## Purpose

Manages each editing page's session state in the browser with conditional
persistence: session content and version history are saved to `localStorage`
only when the user provides a valid custom title. Untitled sessions exist only
in the current page view.

## Requirements

### Requirement: Session state is conditionally stored in the browser

The application SHALL persist a page session's state — title, content, and
version history — in the browser's `localStorage` for the site's origin **only**
when the user has provided a valid custom title. A session without a valid title
SHALL NOT be written to `localStorage`. Persisted state SHALL survive a page
reload, a browser restart, and a restart of the application server, and SHALL NOT
depend on server process memory.

#### Scenario: Titled session state survives a reload

- **WHEN** the user provides a valid title and edits content, then reloads the
  page
- **THEN** the title and content are restored as they were

#### Scenario: Titled session state survives a server restart

- **WHEN** the user has a titled session, the application server restarts, and the
  user reopens the page
- **THEN** the titled session's state is still present

#### Scenario: Untitled session is not persisted

- **WHEN** the user edits content without providing a valid title and reloads the
  page
- **THEN** the content is lost and the page opens with an empty default state

#### Scenario: Stored state does not require a request

- **WHEN** a user loads a session page and the application's server API is not
  reachable
- **THEN** the page still shows that session's stored title and content (if
  titled)

### Requirement: Title validation and placeholder

The title textbox SHALL display `"DevToolKit"` as a placeholder. A title SHALL be
considered valid when it is non-empty, non-whitespace-only, and differs from the
default placeholder (`"DevToolKit"` / `"Devtoolkit"`, case-insensitive). The
session SHALL be marked as **titled** once the user enters any non-whitespace
string differing from the default placeholder.

#### Scenario: Default placeholder is not a valid title

- **WHEN** the user leaves the title as "DevToolKit" or enters "devtoolkit"
- **THEN** the session is not considered titled and is not persisted

#### Scenario: Empty or whitespace-only title is not valid

- **WHEN** the user clears the title or enters only whitespace
- **THEN** the session is not considered titled and is not persisted

#### Scenario: Custom title is valid

- **WHEN** the user enters "My Project Notes"
- **THEN** the session is considered titled and persistence is enabled

### Requirement: Title immutability after focus is lost

Once a session is created and saved with a valid custom title, the title input
field SHALL remain editable while it has focus, so the user can finish typing the
complete title. The input SHALL be set to `disabled="true"` only when it loses
focus with a valid title, and SHALL NOT be editable or renameable afterward for
the lifetime of that session.

#### Scenario: Title remains editable while typing

- **WHEN** the user types a valid title and keeps the title textbox focused
- **THEN** the title input remains enabled and continues to accept characters

#### Scenario: Title becomes read-only when focus is lost

- **WHEN** the user finishes entering a valid title and the title textbox loses
  focus
- **THEN** the title input is disabled and shows the complete saved title

#### Scenario: Invalid title stays editable after focus loss

- **WHEN** the title textbox loses focus with an empty, whitespace-only, or
  default-placeholder value
- **THEN** the title input remains enabled so the user can correct it

#### Scenario: Title cannot be changed after focus loss

- **WHEN** the user has a titled session and attempts to edit the title
- **THEN** the title input does not accept changes (it is disabled)

### Requirement: Single session per page type

Each page type (`text-editor`, `markdown-editor`, `template`) SHALL have at
most one session stored in `localStorage` at key `devtoolkit:sessions:<kind>`.
Different page types SHALL never share state.

#### Scenario: Pages are isolated from each other

- **WHEN** the user creates a titled session on the template page and the text
  editor
- **THEN** each page keeps its own state and neither shows the other's content

#### Scenario: Opening a page with no stored session

- **WHEN** the user opens a page that has no stored session in `localStorage`
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

- **GIVEN** a text-editor or markdown-editor session
- **THEN** each version contains `updatedDate` and `content`
- **GIVEN** a template session
- **THEN** each version contains `updatedDate`, `content`, and `variables`

### Requirement: Version snapshots deduplicate unchanged content

The application SHALL add a new version snapshot only when the current content
attributes differ from the most recent version, ignoring `updatedDate`. When the
content is identical, no duplicate snapshot SHALL be created.

#### Scenario: Unchanged content does not create a duplicate version

- **WHEN** the user navigates away without changing content since the last version
- **THEN** no new version is added to the `versions` array

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

### Requirement: Unsaved changes are protected for untitled sessions

If the session does not have a valid custom title and the editor contains
modified or unsaved content, the application SHALL trigger the browser's native
`beforeunload` confirmation prompt when the user attempts to close, refresh, or
navigate away from the tab. Titled sessions SHALL NOT trigger `beforeunload`
because their content is automatically versioned on navigate-away.

#### Scenario: Warn untitled session with changes

- **WHEN** the user has modified content in an untitled session and attempts to
  leave the page
- **THEN** the browser displays its native confirmation prompt

#### Scenario: No warning for titled sessions

- **WHEN** the user has a titled session (whether modified or not) and navigates
  away
- **THEN** no `beforeunload` prompt is displayed (content is auto-versioned)

#### Scenario: No warning for untitled session without changes

- **WHEN** the user has an untitled session with no modifications and leaves the
  page
- **THEN** no `beforeunload` prompt is displayed

### Requirement: Unavailable browser storage is reported

When the browser's storage is unavailable or cannot be written, the application
SHALL keep the page usable using state held for the current page view only and
SHALL tell the user that changes cannot be persisted.

#### Scenario: Storage is unavailable

- **WHEN** the user opens a session page and browser storage is unavailable
- **THEN** the page still loads with an empty default session
- **AND** the page shows a message that changes will not be persisted

#### Scenario: A failed write is reported

- **WHEN** the application cannot write a session change to browser storage
- **THEN** the change remains visible in the current page view
- **AND** the page reports that the change was not persisted
