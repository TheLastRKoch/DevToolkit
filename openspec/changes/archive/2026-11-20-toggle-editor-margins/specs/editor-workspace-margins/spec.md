# Spec Delta

## Purpose

Lets users control whether the text, markdown, and code editor workspaces are
inset by a wide side margin, so the full viewport width is available by default
and the margined reading layout is one click away.

## ADDED Requirements

### Requirement: Every editor page offers the margin toggle

The text editor (`/text-editor`), markdown editor (`/markdown-editor`), and code
editor (`/code-editor`) pages SHALL each list a `Toggle margins` option in the
shared Options dropdown. Selecting it SHALL flip the workspace margin state,
take effect immediately, and close the dropdown.

#### Scenario: The option is listed on each editor page

- **WHEN** the user opens `/text-editor`, `/markdown-editor`, or `/code-editor`
  and activates the Options dropdown
- **THEN** `Toggle margins` is listed among that page's options

#### Scenario: Selecting the option flips the state

- **WHEN** the user selects `Toggle margins` with margins disabled
- **THEN** the editor workspace gains the side margins
- **AND** selecting `Toggle margins` again removes them

### Requirement: Side margins are disabled on every page load

Each editor page SHALL render its workspace without the 200px side margins until
the user turns them on. The margin state SHALL NOT persist across reloads,
stored sessions, or navigation between editor pages, so every load starts with
margins disabled.

#### Scenario: Fresh load has no side margins

- **WHEN** the user loads any editor page on a viewport at least 768px wide
  without interacting with the margin toggle
- **THEN** the editor workspace has no 200px left or right margin

#### Scenario: Reloading resets the state

- **WHEN** the user enables margins and reloads the page
- **THEN** the reloaded page shows the editor workspace without side margins

### Requirement: Enabled margins inset the workspace by 200px

While margins are enabled, the editor page SHALL apply a 200px left margin and a
200px right margin to the editor workspace on viewports at least 768px wide.
Below 768px the workspace SHALL keep its full width whether or not margins are
enabled.

#### Scenario: Enabled margins apply on wide viewports

- **WHEN** the user enables margins on a viewport at least 768px wide
- **THEN** the editor workspace has 200px of space on its left and right sides

#### Scenario: Narrow viewports ignore the margin state

- **WHEN** the user enables margins on a viewport narrower than 768px
- **THEN** the editor workspace keeps its full width without the 200px inset

### Requirement: Toggling margins does not change editor state

Toggling the margins SHALL only change layout. It SHALL NOT alter the editor
content, the page title, the stored session, or the page's other dropdown
options.

#### Scenario: Content and title survive the toggle

- **WHEN** the user types content and a title, then toggles the margins on and
  off
- **THEN** the content and title are unchanged
- **AND** the stored session content is unchanged
