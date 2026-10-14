# Spec Delta

## Purpose

Provides one reusable page header item — breadcrumb, options dropdown, and
page-name textbox — so every editing page shows the same header row and declares
only its own breadcrumb trail, menu options, and page name instead of
re-implementing the row.

## ADDED Requirements

### Requirement: Pages share one page header item

The application SHALL provide a single reusable page header that renders the
breadcrumb trail, an Options dropdown, and a page-name textbox in one row below
the navbar. Each page that adopts the header SHALL supply its own breadcrumb
items, its own set of dropdown options, and its own page-name value, and SHALL
NOT duplicate the header markup, the dropdown container, or the name textbox.

#### Scenario: Adopting page declares its own header content

- **WHEN** a page adopts the shared page header with a breadcrumb trail, a set of
  options, and a page name
- **THEN** the header renders that breadcrumb trail, those options, and that page
  name in one row below the navbar
- **AND** the page contains no separate copy of the breadcrumb, dropdown, or
  page-name markup

#### Scenario: Header structure is identical across pages

- **WHEN** the user opens any two adopting pages
- **THEN** both pages show the breadcrumb, the Options dropdown, and the
  page-name textbox in the same header row position
- **AND** neither page renders a second breadcrumb row, dropdown, or name
  textbox elsewhere in its layout

### Requirement: The Options dropdown exposes only the current page's options

The page header SHALL open the Options dropdown when the user activates it and
SHALL list exactly the options the current page declared, in the declared order.
Selecting an option SHALL run the action that page assigned to it and SHALL close
the dropdown.

#### Scenario: Options are listed

- **WHEN** the user activates the Options dropdown on a page that declared
  options
- **THEN** the dropdown lists those options in the declared order
- **AND** options declared by other pages are not listed

#### Scenario: Selecting an option runs its action

- **WHEN** the user selects an option from the dropdown
- **THEN** the current page performs the action associated with that option
- **AND** the dropdown closes

### Requirement: Each adopting page declares its own options

The template page SHALL declare New session, Clear variables, and Clear all as
its dropdown options. The text editor page SHALL declare New session and Clear
editor. The markdown editor page SHALL declare New session and Clear editor. A
page SHALL offer no option that it does not implement.

#### Scenario: Template page options

- **WHEN** the user opens the template page and activates the Options dropdown
- **THEN** New session, Clear variables, and Clear all are listed

#### Scenario: Text editor page options

- **WHEN** the user opens the text editor page and activates the Options dropdown
- **THEN** New session and Clear editor are listed
- **AND** no variable-related option is listed

#### Scenario: Markdown editor page options

- **WHEN** the user opens the markdown editor page and activates the Options
  dropdown
- **THEN** New session and Clear editor are listed

### Requirement: The page-name textbox renames the current page

Every adopting page SHALL render a page-name textbox in the header row. Editing
it SHALL update `document.title` to the entered value and SHALL store the entered
value as the current session's page name so the value is restored when that
session is opened again. An empty page name SHALL fall back to the default page
title `Devtoolkit`.

#### Scenario: Editing the page name updates the tab title

- **WHEN** the user types a new value into the page-name textbox
- **THEN** `document.title` becomes that value

#### Scenario: The page name is restored

- **WHEN** the user reloads the page or reopens the same session after typing a
  page name
- **THEN** the page-name textbox shows the stored name
- **AND** `document.title` shows the stored name

#### Scenario: Empty page name falls back to the default

- **WHEN** the user clears the page-name textbox
- **THEN** `document.title` becomes `Devtoolkit`

### Requirement: The page name is scoped to the current page session

The page-name textbox SHALL read and write the page name of the session the page
is currently showing and SHALL NOT change the page name shown by any other page
or by another session of the same page.

#### Scenario: Renaming one session does not rename another

- **WHEN** the user renames the session in one tab and then opens a different
  session of the same page in another tab
- **THEN** the second session keeps its own page name

#### Scenario: Renaming one page does not rename another page

- **WHEN** the user renames the page on the text editor
- **THEN** the template and markdown editor pages keep their own page names
