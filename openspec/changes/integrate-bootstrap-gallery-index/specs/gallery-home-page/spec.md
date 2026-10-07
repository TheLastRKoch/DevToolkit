# Spec Delta

## Purpose

Presents a browsable, filterable ceramics gallery as the DevToolkit home page, using DevToolkit's existing navbar and Bootstrap assets, so visitors get a rich landing page while still reaching the toolkit's tools.

## ADDED Requirements

### Requirement: Home page renders the gallery at the root route

When a client requests `/`, DevToolkit SHALL serve the gallery home page containing the DevToolkit navbar and the interactive gallery.

#### Scenario: Visitor opens the site root

- **WHEN** a browser requests `/`
- **THEN** the response body is the gallery home page
- **AND** the DevToolkit navbar with the `Devtoolkit` brand is present
- **AND** the gallery header and gallery region are present

### Requirement: Navbar keeps DevToolkit chrome and adds a "+" tool-links dropdown

The home page SHALL retain DevToolkit's existing dark navbar with the `Devtoolkit` brand linking to `/`, and SHALL add a "+" button that, when activated, reveals the DevToolkit tool links (Template, Editor, Markdown Editor).

#### Scenario: Tool links are hidden until the "+" button is activated

- **WHEN** the user opens the home page
- **THEN** a "+" button is visible in the navbar
- **AND** the Template, Editor, and Markdown Editor links are not visible

#### Scenario: Activating the "+" button reveals the tool links

- **WHEN** the user activates the "+" button
- **THEN** a dropdown appears containing links to `/template`, `/editor`, and `/markdown-editor`

### Requirement: Gallery header describes the collection

The home page SHALL render a header above the gallery controls containing an eyebrow line, a primary heading, and a lead paragraph.

#### Scenario: Header is present

- **WHEN** the home page is rendered
- **THEN** the eyebrow line, heading, and lead paragraph are visible above the gallery controls

### Requirement: Category filters narrow the gallery

The gallery SHALL render a filter control with an "All" option plus one option per category present in the piece data. Selecting an option SHALL show only pieces in that category, "All" SHALL show every piece, and the active option SHALL be indicated.

#### Scenario: Selecting a category filters the pieces

- **WHEN** the user selects a specific category filter
- **THEN** only pieces belonging to that category are shown
- **AND** the selected filter is visually indicated as active

#### Scenario: All restores every piece

- **WHEN** the user selects the "All" filter
- **THEN** every non-removed piece is shown regardless of category

### Requirement: Search filters pieces by text

The gallery SHALL provide a search input that filters pieces to those whose title, glaze, clay, or category contains the query, case-insensitively. An empty query SHALL match all pieces, and the search SHALL combine with the active category filter.

#### Scenario: Query narrows results

- **WHEN** the user enters text matching a piece's title, glaze, clay, or category
- **THEN** only matching pieces are shown

#### Scenario: Search combines with a category filter

- **WHEN** a category filter and a search query are both active
- **THEN** only pieces satisfying both are shown

### Requirement: Result count and empty state reflect the visible pieces

The gallery SHALL display a live result count of the currently visible pieces and SHALL show an empty state, including a reset control, when no pieces are visible.

#### Scenario: Count reflects visible pieces

- **WHEN** the set of visible pieces changes
- **THEN** the result count is updated to the number of visible pieces

#### Scenario: Empty state appears when nothing matches

- **WHEN** no pieces match the active filters
- **THEN** the gallery grid is hidden and an empty state with a reset control is shown

#### Scenario: Reset restores the default view

- **WHEN** the user activates the reset control
- **THEN** the category returns to "All", the search query is cleared, the saved-only filter is disabled, and any removed pieces are restored

### Requirement: Saved toggle and per-piece removal

The gallery SHALL let the user save and unsave pieces, SHALL provide a saved-only toggle that shows only saved pieces, SHALL display the saved count, and SHALL let the user remove a piece from the current view.

#### Scenario: Saved count updates as pieces are saved

- **WHEN** the user saves or unsaves a piece
- **THEN** the saved count reflects the current number of saved pieces

#### Scenario: Saved-only toggle filters to saved pieces

- **WHEN** the saved-only toggle is enabled
- **THEN** only saved pieces are shown
- **AND** the toggle indicates its active state

#### Scenario: Removing a piece takes it out of the view

- **WHEN** the user removes a piece
- **THEN** that piece is no longer visible in the gallery
- **AND** it is no longer counted as saved

### Requirement: Piece images render with Bootstrap thumbnail styling

Each piece SHALL render its image as an `<img>` element carrying the Bootstrap `img-thumbnail` class and a non-empty descriptive `alt` attribute. The DevToolkit repository SHALL NOT be required to contain the original gallery image binaries.

#### Scenario: Piece image uses thumbnail styling

- **WHEN** a piece is rendered
- **THEN** its image element has the `img-thumbnail` class and a descriptive `alt` value

### Requirement: The page depends only on DevToolkit's Bootstrap assets

The home page SHALL load DevToolkit's existing Bootstrap stylesheet and bundle plus its own gallery module, and SHALL NOT require Bootstrap Icons or Google Fonts to render its controls or feedback.

#### Scenario: No icon-font or web-font dependency

- **WHEN** the home page is loaded
- **THEN** no Bootstrap Icons or Google Fonts resource is required for the page to function or for its controls to display
