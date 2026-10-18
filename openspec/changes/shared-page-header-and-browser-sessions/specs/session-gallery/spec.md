# Spec Delta

## Purpose

Provides the home page (`/`) session gallery, which reads saved sessions from
browser `localStorage` and replaces the static piece catalog with session cards,
kind filters, search, and per-session delete.

## ADDED Requirements

### Requirement: Home page session gallery

The home page (`/`) SHALL read all `devtoolkit:sessions:*` keys from
`localStorage` and display saved sessions as gallery cards, replacing the static
piece data. The gallery SHALL offer kind filters (All plus one per session kind),
search by title, and per-session delete.

#### Scenario: Sessions are displayed as cards

- **WHEN** the user opens the home page and there are saved sessions
- **THEN** each saved session is rendered as a card with its title in the
  `<h2>` element and its kind · latest `updatedDate` in the `<p>` element

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
- **THEN** the gallery shows an empty state message
