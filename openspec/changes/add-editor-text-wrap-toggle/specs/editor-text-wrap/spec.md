# Spec Delta

## Purpose

Lets users switch text wrapping on and off from the keyboard in the code and raw
text editors, so long lines can be read in full without losing the ability to
scan them unwrapped.

## ADDED Requirements

### Requirement: The shortcut toggles text wrap

The code editor (`/code-editor`) and raw text editor (`/raw-text-editor`) pages
SHALL toggle their text wrap state when the user presses `Alt+Z` on Windows and
Linux or `Option+Z` on macOS. The shortcut SHALL work whether or not the editing
surface currently has focus.

#### Scenario: The shortcut enables wrapping

- **WHEN** the user presses `Alt+Z` (or `Option+Z`) on a page whose text wrap is
  disabled
- **THEN** the editor wraps long lines at the editing surface width

#### Scenario: The shortcut disables wrapping again

- **WHEN** the user presses the shortcut a second time on the same page
- **THEN** long lines stop wrapping and extend horizontally again

#### Scenario: The shortcut works without editor focus

- **WHEN** focus is outside the editing surface and the user presses the
  shortcut
- **THEN** the text wrap state still toggles

### Requirement: Text wrap starts disabled

Both pages SHALL render with text wrap disabled on every load, including after a
reload, after navigating between editor pages, and when an existing session is
reopened. The wrap state SHALL NOT be persisted in the browser session or
restored with stored content.

#### Scenario: A fresh load has wrapping disabled

- **WHEN** the user opens `/code-editor` or `/raw-text-editor` without pressing
  the shortcut
- **THEN** long lines are not wrapped and the editing surface scrolls
  horizontally instead

#### Scenario: Reloading resets the state

- **WHEN** the user enables wrapping and reloads the page
- **THEN** the reloaded page has wrapping disabled again

#### Scenario: Reopening a stored session resets the state

- **WHEN** the user enables wrapping, leaves the page, and reopens the stored
  session
- **THEN** the restored session has wrapping disabled

### Requirement: Disabled wrapping scrolls instead of clipping

While text wrap is disabled, lines wider than the editing surface SHALL remain
reachable by horizontal scrolling rather than being truncated or hidden.

#### Scenario: Long lines stay reachable

- **WHEN** wrapping is disabled and the editor holds a line wider than the
  visible area
- **THEN** the line is cut off at the edge, the editing surface offers
  horizontal scrolling, and the remainder of the line can be scrolled into view

#### Scenario: Enabled wrapping removes horizontal scrolling for text

- **WHEN** wrapping is enabled on the same content
- **THEN** the long line is shown in full across multiple display rows

### Requirement: The shortcut is consumed by the page

The page SHALL prevent the default action of the shortcut and SHALL NOT insert a
`z` or any other character into the document when it toggles the wrap state.
Other `Alt`/`Option` shortcuts and plain `z` typing SHALL keep their normal
behavior.

#### Scenario: No character is inserted

- **WHEN** the editing surface has focus and the user presses the shortcut
- **THEN** the wrap state toggles and the document text and character count are
  unchanged

#### Scenario: Plain typing is unaffected

- **WHEN** the user types the letter `z` without `Alt` or `Option`
- **THEN** `z` is inserted at the cursor as usual

### Requirement: Toggling wrap does not change editor state

Toggling text wrap SHALL only change how content is displayed. It SHALL NOT alter
the editor content, the page title, the stored session or its versions, the
reported character count, line numbers, syntax highlighting, or the page's
Options dropdown.

#### Scenario: Content and title survive the toggle

- **WHEN** the user types content and a title, then toggles wrapping on and off
- **THEN** the content and title are unchanged
- **AND** the stored session content is unchanged

#### Scenario: Options are unchanged

- **WHEN** the user opens the Options dropdown after toggling wrapping
- **THEN** it lists the same options it listed before the toggle
