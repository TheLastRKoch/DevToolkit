# Spec Delta

## Purpose

Provides a dedicated code editing page that preserves pasted source text
exactly, highlights it according to an automatically detected language, shows
the active language and character count, and stores the work in the same
browser-side sessions as the other editing pages.

## ADDED Requirements

### Requirement: The code editor is served at the code editor endpoint

The application SHALL serve an untitled new code editor session at
`/code-editor` and the saved session with the given numeric ID at
`/code-editor/<id>`. Both routes SHALL respond with the code editor page and
status `200`. A non-numeric session ID SHALL respond with status `404`.

#### Scenario: Opening the code editor

- **WHEN** the user requests `/code-editor`
- **THEN** the application responds with the code editor page with status `200`
  and the page starts a fresh untitled session

#### Scenario: Opening a saved code editor session

- **WHEN** the user requests `/code-editor/3`
- **THEN** the application responds with the code editor page with status `200`
  and the page loads session `3`

#### Scenario: Non-numeric session ID is rejected

- **WHEN** the user requests `/code-editor/abc`
- **THEN** the application responds with status `404`

### Requirement: The code editor uses the shared header and page naming

The code editor page SHALL mount the shared page header with the title textbox
and Options dropdown, and SHALL NOT render its own toolbar markup. The Options
dropdown SHALL contain exactly one action, `Clear editor`. The page and its home
page entry SHALL be named `Code Editor`.

#### Scenario: Shared header is mounted

- **WHEN** the user opens `/code-editor`
- **THEN** the shared header renders the title textbox with placeholder
  `DevToolKit` and an Options dropdown containing `Clear editor`

#### Scenario: Default page title

- **WHEN** the user opens the code editor without a stored title
- **THEN** `document.title` is `Devtoolkit`

#### Scenario: Home page entry

- **WHEN** the user opens the home page New dropdown
- **THEN** it contains a `Code Editor` entry that links to `/code-editor`

### Requirement: The code editor preserves source text exactly

The code editor page SHALL present a plain-text code editing surface as its main
content. It SHALL preserve whitespace, indentation, tabs, and line breaks of
pasted or typed content, and SHALL NOT apply any rich-text formatting to it. The
text editor's format bar SHALL NOT be present.

#### Scenario: Pasting code keeps its exact text

- **WHEN** the user pastes multi-line indented code into the editing surface
- **THEN** the editor contains that text character for character, including
  leading spaces, tabs, and newlines

#### Scenario: No rich-text formatting is offered

- **WHEN** the user views the code editor page
- **THEN** no bold, italic, alignment, list, or other rich-text format controls
  are shown

### Requirement: The code editor provides code editing conveniences

The editing surface SHALL show line numbers, SHALL support undo and redo, SHALL
highlight matching brackets, and SHALL provide in-editor search, without
requiring the user to enable them.

#### Scenario: Line numbers are visible

- **WHEN** the user opens the code editor with several lines of code
- **THEN** each code line is displayed next to its line number

#### Scenario: Undo restores the previous text

- **WHEN** the user types code and then triggers undo
- **THEN** the editor returns to its earlier text without the last typed change

#### Scenario: Search finds text in the editor

- **WHEN** the user opens search and enters text present in the editor
- **THEN** the matching occurrences in the editor are highlighted

### Requirement: The code language is detected automatically

The code editor SHALL detect the code language from the editor content and SHALL
apply syntax highlighting for the detected language. Detection SHALL update as
the content changes. When no supported language is recognized, the editor SHALL
use plain text highlighting and report the language as `Plain Text`.

#### Scenario: JSON content is detected

- **WHEN** the user pastes valid JSON into the editor
- **THEN** the JSON syntax is highlighted and the reported language is `JSON`

#### Scenario: JavaScript content is detected

- **WHEN** the user pastes JavaScript source into the editor
- **THEN** the JavaScript syntax is highlighted and the reported language is
  `JavaScript`

#### Scenario: Unrecognized content falls back to plain text

- **WHEN** the editor content does not match any supported language
- **THEN** the editor shows plain text and the reported language is `Plain Text`

### Requirement: The detected language can be overridden

The status bar SHALL provide a language control that lists the supported
languages plus an `Auto` choice. Selecting a language SHALL apply its syntax
highlighting immediately regardless of detection. Selecting `Auto` SHALL resume
automatic detection. Changing the editor content SHALL NOT replace a manually
selected language.

#### Scenario: Manual selection overrides detection

- **WHEN** the editor detects JavaScript and the user selects `JSON`
- **THEN** the editor applies JSON highlighting and reports `JSON`

#### Scenario: Auto resumes detection

- **WHEN** a language is manually selected and the user selects `Auto`
- **THEN** the editor highlights the content using the language detected from it

#### Scenario: Editing keeps a manual selection

- **WHEN** the user manually selects a language and then edits the content
- **THEN** the manually selected language remains applied

### Requirement: The status bar reports language and character count

The page SHALL show a status bar directly below the editing surface. Its left
side SHALL show the active language, and it SHALL show the current character
count of the editor content, which SHALL update as the content changes.

#### Scenario: Character count updates

- **WHEN** the user types or pastes additional characters
- **THEN** the displayed character count increases by the number of characters
  added

#### Scenario: Language is shown on the left

- **WHEN** the user opens the code editor
- **THEN** the status bar shows the active language on its left side

### Requirement: The code editor stores its content in the browser session

The code editor SHALL store its title and content in the browser session under
the `code-editor` kind, following the same conditional-persistence rules as the
other editing pages: content SHALL be persisted only after the user provides a
valid custom title, and a titled session SHALL be restored when its page is
loaded again.

#### Scenario: Content is restored after reload

- **WHEN** the user provides a valid title, types code, and reloads the page
- **THEN** the entered code and title are restored in the editor and header

#### Scenario: Untitled content is not persisted

- **WHEN** the user types code without a valid title and reloads the page
- **THEN** the editor opens empty

#### Scenario: Session URL reflects the saved session

- **WHEN** an untitled code editor session becomes titled
- **THEN** the page URL changes to `/code-editor/<id>` for the saved session

### Requirement: Unsaved code editor work is protected

An untitled code editor session with content changes SHALL prompt the user
before the page is left. A titled session SHALL record its latest content as a
version on leaving instead of prompting when persistence is available.

#### Scenario: Untitled changes prompt on leave

- **WHEN** the user has typed code without a valid title and attempts to leave
  the page
- **THEN** the browser asks the user to confirm leaving

#### Scenario: Titled session does not prompt

- **WHEN** the user has a valid title and typed code, then leaves the page
- **THEN** the latest content is recorded as a session version and no prompt is
  shown

### Requirement: Code editor content is isolated from other pages

The code editor SHALL keep its session content separate from every other editing
page kind.

#### Scenario: Other pages keep their own content

- **WHEN** the user types code into the code editor
- **THEN** the text editor, markdown editor, template, and list compare pages keep
  their own content

### Requirement: Clear editor empties the content and keeps the title

The `Clear editor` option SHALL empty the editor content and SHALL keep the
current title.

#### Scenario: Clear editor keeps the title

- **WHEN** the user selects `Clear editor` on a titled code editor session
- **THEN** the editor becomes empty and the title remains unchanged
