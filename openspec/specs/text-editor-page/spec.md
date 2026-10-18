# text-editor-page Specification

## Purpose

Defines the text editor endpoint and page introduced by renaming the editor
route, so the page and its navigation entry consistently use the Text Editor
name while old links keep working.

## Requirements

### Requirement: The text editor is served at the text editor endpoint

The application SHALL serve an untitled new text editor session at
`/text-editor`. It SHALL also serve the saved session with the given numeric ID
at `/text-editor/<id>`. Both routes SHALL respond with the text editor page and
status `200`. A non-numeric session ID SHALL respond with status `404`.

#### Scenario: Opening the text editor

- **WHEN** the user requests `/text-editor`
- **THEN** the application responds with the text editor page with status `200`
  and the page starts a fresh untitled session

#### Scenario: Opening a saved text editor session

- **WHEN** the user requests `/text-editor/3`
- **THEN** the application responds with the text editor page with status `200`
  and the page loads session `3`

#### Scenario: Non-numeric session ID is rejected

- **WHEN** the user requests `/text-editor/abc`
- **THEN** the application responds with status `404`

### Requirement: The editor route redirects to the text editor endpoint

The application SHALL keep the legacy `/editor` route working as a redirect to
`/text-editor` and the legacy `/editor/<id>` route working as a redirect to
`/text-editor/<id>` so existing links and bookmarks still reach the page.

#### Scenario: Legacy route redirects

- **WHEN** the user requests `/editor`
- **THEN** the application redirects to `/text-editor`
- **AND** the request ultimately resolves to the text editor page with status
  `200`

#### Scenario: Legacy session route redirects

- **WHEN** the user requests `/editor/3`
- **THEN** the application redirects to `/text-editor/3`
- **AND** the request ultimately resolves to the text editor page with status
  `200`

### Requirement: The text editor is named consistently

The text editor page and its navigation entry on the home page SHALL use the
name `Text Editor`, and SHALL NOT present the page as `Editor`.

#### Scenario: Home page entry

- **WHEN** the user opens the home page
- **THEN** the page list contains a `Text Editor` entry that links to
  `/text-editor`

#### Scenario: Page title

- **WHEN** the user opens the text editor without a stored title
- **THEN** `document.title` is `Devtoolkit`

### Requirement: The text editor provides a rich-text editing surface

The text editor page SHALL present a rich-text editing surface as its main
content, SHALL show the shared page header above it, and SHALL store the edited
content in the page's browser session so it is restored when the session is
loaded again (if titled).

#### Scenario: Editing and restoring content

- **WHEN** the user provides a valid title, types into the text editor, and
  reloads the page
- **THEN** the entered content is still present in the editing surface

#### Scenario: Content is isolated from other pages

- **WHEN** the user types into the text editor
- **THEN** the template and markdown editor pages keep their own content
