# session-gallery Specification

## Purpose

Provides the home page (`/`) session gallery, which reads saved sessions from
browser `localStorage` and replaces the static piece catalog with session cards,
title links to each session's page, kind filters, search, and per-session delete.

## Requirements

### Requirement: Home page session gallery

The home page (`/`) SHALL read all `devtoolkit:sessions:*` keys from
`localStorage` and display saved sessions as gallery cards, replacing the static
piece data. The gallery SHALL offer kind filters (All plus one per session kind),
search by title, and per-session delete. When no sessions are saved, the gallery
SHALL show a text-only empty state message without a folder icon or other
decorative icon.

#### Scenario: Sessions are displayed as cards

- **WHEN** the user opens the home page and there are saved sessions
- **THEN** each saved session is rendered as a card with its title as a link in
  the `<h2>` element and its kind · latest `updatedDate` in the `<p>` element

#### Scenario: Filters show session kinds

- **WHEN** the user opens the home page
- **THEN** the filter buttons show the kinds of stored sessions (e.g.,
  `text-editor`, `markdown-editor`, `template`) plus an "All" option

#### Scenario: Search filters sessions by title

- **WHEN** the user types a query into the gallery search box
- **THEN** only sessions whose title matches the query are shown

#### Scenario: Deleting a session from the gallery

- **WHEN** the user clicks the remove button (×) on a session card
- **THEN** the session is deleted from `localStorage` and the card is removed
  from the gallery

#### Scenario: Empty state when no sessions exist

- **WHEN** the user opens the home page and there are no saved sessions
- **THEN** the gallery shows a text-only empty state message with no folder
  icon or other decorative icon

### Requirement: Session titles open the session's page

Each gallery card's title SHALL be a link to the page for that session's kind:
`/text-editor` for `text-editor`, `/markdown-editor` for `markdown-editor`, and
`/template` for `template`. Following the link SHALL open that page with the
session's stored content, including the template text and variables for a
template session.

#### Scenario: Title link targets the matching page

- **WHEN** the user views a saved session card
- **THEN** its title is a link to the page matching the session's kind

#### Scenario: Text editor session opens with its content

- **WHEN** the user follows a `text-editor` session title
- **THEN** `/text-editor` opens with the session's content in the editor

#### Scenario: Markdown session opens with its raw text

- **WHEN** the user follows a `markdown-editor` session title
- **THEN** `/markdown-editor` opens with the session's raw markdown in the editor

#### Scenario: Template session opens with its template and variables

- **WHEN** the user follows a `template` session title
- **THEN** `/template` opens with the session's template text and variables
  populated
