# Spec Delta

## Purpose

Keeps each editing page's session state in the browser so work survives page
reloads and server restarts, stays isolated per page and per session, and expires
on a defined 30-day schedule.

## ADDED Requirements

### Requirement: Session state is stored in the browser

The application SHALL persist each page session's state — page name and the
page's editable content, including template variables where the page has them —
in the browser's own storage (`localStorage`) for the site's origin. Page state
SHALL survive a page reload, a browser restart, and a restart of the application
server, and SHALL NOT depend on server process memory.

#### Scenario: State survives a reload

- **WHEN** the user edits the page name or the content and then reloads the page
- **THEN** the page name and the content are restored as they were edited

#### Scenario: State survives a server restart

- **WHEN** the user edits a page session, the application server restarts, and the
  user reopens that session
- **THEN** the edited state is still present

#### Scenario: Stored state does not require a request

- **WHEN** a user loads a session page and the application's server API is not
  reachable
- **THEN** the page still shows that session's stored page name and content

### Requirement: Every session page is addressable and isolated

Each session-based page SHALL address its sessions by an incrementing numeric
identifier in the route, for example `/template/1`, `/text-editor/1`, and
`/markdown-editor/1`. Sessions of the same page SHALL keep their state isolated,
and different pages SHALL never share state even when they use the same
identifier.

#### Scenario: Sessions of one page are isolated

- **WHEN** the user edits one session of a page and then opens a different
  session of that same page
- **THEN** the second session shows its own name and content, unaffected by the
  first

#### Scenario: Pages are isolated from each other

- **WHEN** the user edits session `1` of the template page, the text editor, and
  the markdown editor
- **THEN** each page keeps its own state and none of them shows another page's
  content

#### Scenario: Opening a session that has no stored state

- **WHEN** the user opens a valid session route that has no stored state
- **THEN** the page opens with an empty default session named `Devtoolkit`

#### Scenario: Rejecting an invalid session route

- **WHEN** the user opens a session route whose identifier is not a valid
  positive integer
- **THEN** the application responds with an error status instead of the page

#### Scenario: Opening a page without a session identifier

- **WHEN** the user requests a session page without a session identifier, such as
  `/markdown-editor`
- **THEN** the application redirects to that page's first session route,
  `/markdown-editor/1`
- **AND** the request ultimately resolves to the page with status `200`

### Requirement: New sessions are allocated in the browser

Activating New session SHALL allocate the next free session identifier for the
current page from browser storage, leaving every existing session unchanged, and
SHALL open the new session in a new browser tab at that page's session route.

#### Scenario: Opening a new session

- **WHEN** the user selects New session
- **THEN** a new session identifier greater than every existing identifier for
  that page is allocated in browser storage
- **AND** the new session opens in a new browser tab at `/<page>/<new-identifier>`

#### Scenario: Existing sessions are unchanged

- **WHEN** the user opens a new session after editing another one
- **THEN** the previously edited session keeps all of its state

### Requirement: Stored sessions expire after 30 days

A stored session SHALL carry the time of its last modification and SHALL be
treated as expired once 30 days have passed since that time. When a page opens an
expired session, the application SHALL discard the expired stored state and
initialize a fresh default session for that identifier.

#### Scenario: Fresh session is kept

- **WHEN** the user edits a session whose stored state was last modified less than
  30 days ago
- **THEN** the stored state is restored unchanged

#### Scenario: Expired session is discarded

- **WHEN** the user opens a session whose stored state was last modified more than
  30 days ago
- **THEN** the expired stored state is removed
- **AND** the page opens as an empty default session named `Devtoolkit`

#### Scenario: Editing extends the lifetime

- **WHEN** the user modifies an existing session
- **THEN** that session's last-modification time is refreshed

### Requirement: Session lifecycle actions update browser state

Each page's session actions SHALL update only browser-stored state. Clear editor
SHALL empty the page's editable content while keeping the page name. Clear
variables SHALL remove all variable values while keeping the template text.
Clear all SHALL empty the page's editable content and its stored state for that
session, keeping the page name.

#### Scenario: Clear editor

- **WHEN** the user selects Clear editor
- **THEN** the editor content becomes empty
- **AND** the page name is unchanged

#### Scenario: Clear variables

- **WHEN** the user selects Clear variables on the template page
- **THEN** all variable values are removed
- **AND** the template text is preserved

#### Scenario: Clear all

- **WHEN** the user selects Clear all on the template page
- **THEN** the template text and all variables are emptied

### Requirement: Unsaved changes are still protected

The application SHALL track edits to the page name and to the page's editable
content, SHALL treat the active session as dirty while those edits have not been
persisted to browser storage, and SHALL request the browser's native
unsaved-changes confirmation when the user closes, refreshes, or navigates away
while the active session is dirty.

#### Scenario: Warn while an edit is unpersisted

- **WHEN** the user leaves the page while an edit to the page name or content has
  not been persisted to browser storage
- **THEN** the browser displays its native confirmation prompt

#### Scenario: Do not warn when everything is persisted

- **WHEN** the user leaves the page after every edit has been persisted to
  browser storage
- **THEN** no confirmation prompt is requested

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
