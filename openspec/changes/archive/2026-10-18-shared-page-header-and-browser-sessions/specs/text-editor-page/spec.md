# Spec Delta

## Purpose

Defines the text editor endpoint and page introduced by renaming the editor
route, so the page and its navigation entry consistently use the Text Editor
name while old links keep working.

## ADDED Requirements

### Requirement: The text editor is served at the text editor endpoint

The application SHALL serve the text editor page at `/text-editor`. The
`/text-editor` route SHALL respond with the text editor page with status `200`.

#### Scenario: Opening the text editor

- **WHEN** the user requests `/text-editor`
- **THEN** the application responds with the text editor page with status `200`

### Requirement: The editor route redirects to the text editor endpoint

The application SHALL keep the legacy `/editor` route working as a redirect to
`/text-editor` so existing links and bookmarks still reach the page.

#### Scenario: Legacy route redirects

- **WHEN** the user requests `/editor`
- **THEN** the application redirects to `/text-editor`
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
