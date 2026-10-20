# Spec Delta

## MODIFIED Requirements

### Requirement: Home page session gallery

The home page (`/`) SHALL read every `devtoolkit:sessions:<kind>:<id>` key from
`localStorage` and display each saved session as a gallery card. The gallery
SHALL offer kind filters (All plus one per session kind), search by title, and
per-session delete. When no sessions are saved, the gallery SHALL show a
text-only empty state message without a folder icon or other decorative icon.

#### Scenario: Sessions are displayed as cards

- **WHEN** the user opens the home page and there are saved sessions
- **THEN** each saved session is rendered as a card with its title as a link to
  `/<kind>/<id>` and its kind · latest `updatedDate` in the `<p>` element

#### Scenario: Multiple sessions of one kind appear

- **WHEN** the user has three titled template sessions
- **THEN** the gallery shows three template cards, one per session ID

#### Scenario: Filters show session kinds

- **WHEN** the user opens the home page
- **THEN** the filter buttons show the kinds of stored sessions (e.g.,
  `text-editor`, `markdown-editor`, `template`) plus an "All" option

#### Scenario: Search filters sessions by title

- **WHEN** the user types a query into the gallery search box
- **THEN** only sessions whose title matches the query are shown

#### Scenario: Deleting a session from the gallery

- **WHEN** the user clicks the remove button (×) on a session card
- **THEN** only that session's `devtoolkit:sessions:<kind>:<id>` key is removed
  and its card disappears from the gallery

#### Scenario: Empty state when no sessions exist

- **WHEN** the user opens the home page and there are no saved sessions
- **THEN** the gallery shows a text-only empty state message with no folder
  icon or other decorative icon

### Requirement: Session titles open the session's page

Each gallery card's title SHALL link to `/<kind>/<id>` for that session.
Following the link SHALL open the page with that session's stored content,
including the template text and variables for a template session.

#### Scenario: Title link targets the matching page

- **WHEN** the user views a saved template session with ID `2`
- **THEN** its title links to `/template/2`

#### Scenario: Text editor session opens with its content

- **WHEN** the user follows a `text-editor` session title
- **THEN** `/text-editor/<id>` opens with that session's content in the editor

#### Scenario: Markdown session opens with its raw text

- **WHEN** the user follows a `markdown-editor` session title
- **THEN** `/markdown-editor/<id>` opens with that session's raw markdown in the
  editor

#### Scenario: Template session opens with its template and variables

- **WHEN** the user follows a `template` session title
- **THEN** `/template/<id>` opens with that session's template text and
  variables populated

## ADDED Requirements

### Requirement: The New control starts a fresh session

The gallery's New dropdown SHALL link each page type to its ID-less route
(`/template`, `/text-editor`, `/markdown-editor`). Following a New link SHALL
open an empty untitled session and SHALL NOT load a saved session.

#### Scenario: New template session

- **WHEN** the user selects Template from the New dropdown
- **THEN** `/template` opens with an empty untitled template session

#### Scenario: New session does not reuse a saved session

- **WHEN** saved sessions exist for the selected page type
- **THEN** the New link still opens an empty session rather than the most recent
  saved session
