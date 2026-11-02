# Spec Delta

## MODIFIED Requirements

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
