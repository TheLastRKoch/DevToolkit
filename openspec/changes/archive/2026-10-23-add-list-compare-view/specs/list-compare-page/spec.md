# Spec Delta

## Purpose

Provides a client-side list comparison tool within DevToolKit for comparing two lists, deduplicating lines, calculating differences and intersections, and persisting comparison session data.

## ADDED Requirements

### Requirement: List compare is served at the list compare endpoint

The application SHALL serve an untitled new list compare session at `/list-compare`. It SHALL also serve the saved session with the given numeric ID at `/list-compare/<id>`. Both routes SHALL respond with the list compare page and status `200`. A non-numeric session ID SHALL respond with status `404`.

#### Scenario: Opening the list compare page
- **WHEN** the user requests `/list-compare`
- **THEN** the application responds with the list compare page with status `200` and starts a fresh untitled session

#### Scenario: Opening a saved list compare session
- **WHEN** the user requests `/list-compare/2`
- **THEN** the application responds with the list compare page with status `200` and loads session `2`

#### Scenario: Non-numeric session ID is rejected
- **WHEN** the user requests `/list-compare/invalid`
- **THEN** the application responds with status `404`

### Requirement: Separation of page structure and script logic

The list compare page HTML file (`public/list-compare.html`) SHALL NOT contain inline application scripts. All interactive logic, list processing algorithms, event listeners, and session integrations SHALL reside in the external script module `public/static/scripts/list-compare.js`.

#### Scenario: External script module is loaded
- **WHEN** the user inspects `public/list-compare.html`
- **THEN** the page includes a `<script>` tag referencing `/static/scripts/list-compare.js`
- **AND** there is no inline `<script>` containing list processing or comparison logic

### Requirement: Shared page header and title integration

The list compare page SHALL mount the shared page header component (`#pageHeader`) below the navbar. The page SHALL render the title textbox with placeholder `"DevToolKit"` and supply a "Clear all" action in the header Options dropdown.

#### Scenario: Shared header mounts on list compare
- **WHEN** the user navigates to `/list-compare`
- **THEN** `#pageHeader` renders the options dropdown and the title textbox
- **AND** the options dropdown includes "Clear all"

#### Scenario: Selecting Clear all option
- **WHEN** the user selects "Clear all" from the header options dropdown
- **THEN** the inputs for List A and List B are emptied, badges reset, and results are hidden

### Requirement: List comparison and deduplication

The list compare tool SHALL provide textareas for List A and List B, live item counts, and a "Compare lists" action. When comparison is executed, each list SHALL be deduplicated, and items SHALL be partitioned into "Only in list A", "Only in list B", and "In both lists" categories.

#### Scenario: Comparing two distinct lists
- **WHEN** List A contains items "alpha\nbeta" and List B contains items "beta\ngamma" and the user triggers comparison
- **THEN** "Only in list A" contains "alpha", "Only in list B" contains "gamma", and "In both lists" contains "beta"
- **AND** summary count badges update accordingly

#### Scenario: Comparison deduplicates repeated items
- **WHEN** List A contains duplicate lines "one\none\ntwo"
- **THEN** triggering comparison updates List A textarea to "one\ntwo" without duplicates

#### Scenario: Case-insensitivity toggle
- **WHEN** the case-insensitive toggle is checked and List A has "APPLE" and List B has "apple"
- **THEN** "apple" is recognized as present in both lists

#### Scenario: Whitespace trimming toggle
- **WHEN** the trim whitespace toggle is checked and input lines have leading or trailing whitespace
- **THEN** lines are trimmed prior to comparison and empty lines are excluded

### Requirement: Text replacement and export tools

The list compare tool SHALL provide a text replacement utility to find and replace substrings or regular expressions across both lists, support loading text files into either list, and enable copying or downloading categorized results.

#### Scenario: Text replacement across both lists
- **WHEN** the user enters a search term and replacement value and triggers replacement
- **THEN** matching strings in both List A and List B are replaced simultaneously

#### Scenario: Downloading categorized results
- **WHEN** the user clicks "Download" for "In both lists"
- **THEN** a text file containing the intersection items is generated and downloaded in the browser
