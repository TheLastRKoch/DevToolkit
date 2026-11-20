# Spec Delta

## MODIFIED Requirements

### Requirement: The text editor is served at the text editor endpoint

The application SHALL serve an untitled new raw text editor session at
`/raw-text-editor`. It SHALL also serve the saved session with the given numeric
ID at `/raw-text-editor/<id>`. Both routes SHALL respond with the raw text
editor page and status `200`. A non-numeric session ID SHALL respond with status
`404`. The former `/text-editor` and `/text-editor/<id>` routes SHALL NOT be
served and SHALL respond with status `404`.

#### Scenario: Opening the text editor

- **WHEN** the user requests `/raw-text-editor`
- **THEN** the application responds with the raw text editor page with status
  `200` and the page starts a fresh untitled session

#### Scenario: Opening a saved text editor session

- **WHEN** the user requests `/raw-text-editor/3`
- **THEN** the application responds with the raw text editor page with status
  `200` and the page loads session `3`

#### Scenario: Non-numeric session ID is rejected

- **WHEN** the user requests `/raw-text-editor/abc`
- **THEN** the application responds with status `404`

#### Scenario: Former text editor route is gone

- **WHEN** the user requests `/text-editor` or `/text-editor/3`
- **THEN** the application responds with status `404`

### Requirement: The editor route redirects to the text editor endpoint

The application SHALL keep the legacy `/editor` route working as a redirect to
`/raw-text-editor` and the legacy `/editor/<id>` route working as a redirect to
`/raw-text-editor/<id>` so existing links and bookmarks still reach the page.

#### Scenario: Legacy route redirects

- **WHEN** the user requests `/editor`
- **THEN** the application redirects to `/raw-text-editor`
- **AND** the request ultimately resolves to the raw text editor page with
  status `200`

#### Scenario: Legacy session route redirects

- **WHEN** the user requests `/editor/3`
- **THEN** the application redirects to `/raw-text-editor/3`
- **AND** the request ultimately resolves to the raw text editor page with
  status `200`

### Requirement: The text editor is named consistently

The raw text editor page and its navigation entry on the home page SHALL use the
name `Raw Text Editor`, and SHALL NOT present the page as `Text Editor` or
`Editor`.

#### Scenario: Home page entry

- **WHEN** the user opens the home page
- **THEN** the page list contains a `Raw Text Editor` entry that links to
  `/raw-text-editor`

#### Scenario: Page title

- **WHEN** the user opens the raw text editor without a stored title
- **THEN** `document.title` is `Devtoolkit`

## ADDED Requirements

### Requirement: Pasted content is normalized to the editor's plain appearance

Whenever text is pasted into the raw text editor's editing surface, the
application SHALL remove any background color from the pasted content and SHALL
set the pasted text's font color to black. Pasting SHALL NOT alter content that
was already in the editor before the paste, programmatically inserted content,
or content restored from a stored session.

#### Scenario: Pasting styled content removes its background

- **WHEN** the user pastes content that carries a background color
- **THEN** the pasted text is inserted without any background color

#### Scenario: Pasting styled content sets the font color to black

- **WHEN** the user pastes content that carries a non-black font color
- **THEN** the pasted text is inserted with black font color

#### Scenario: Existing content is untouched by a paste

- **WHEN** the editor already contains content and the user pastes styled text
  elsewhere in the document
- **THEN** only the pasted text has its background removed and its font color
  set to black

#### Scenario: Restoring a stored session keeps its formatting

- **WHEN** a titled session is loaded and its stored content is restored
- **THEN** the restored content is not rewritten by the paste normalization
