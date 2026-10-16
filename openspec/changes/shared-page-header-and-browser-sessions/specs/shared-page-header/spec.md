# Spec Delta

## Purpose

Provides one reusable page header item — breadcrumb, options dropdown, and
title textbox — so every editing page shows the same header row and declares
only its own breadcrumb trail, menu options, and title instead of
re-implementing the row.

## ADDED Requirements

### Requirement: Pages share one page header item

The application SHALL provide a single reusable page header that renders the
breadcrumb trail, an Options dropdown, and a title textbox in one row below
the navbar. Each page that adopts the header SHALL supply its own breadcrumb
items, its own set of dropdown options, and its own title value, and SHALL
NOT duplicate the header markup, the dropdown container, or the title textbox.

#### Scenario: Adopting page declares its own header content

- **WHEN** a page adopts the shared page header with a breadcrumb trail, a set of
  options, and a title
- **THEN** the header renders that breadcrumb trail, those options, and that title
  in one row below the navbar
- **AND** the page contains no separate copy of the breadcrumb, dropdown, or
  title markup

#### Scenario: Header structure is identical across pages

- **WHEN** the user opens any two adopting pages
- **THEN** both pages show the breadcrumb, the Options dropdown, and the
  title textbox in the same header row position
- **AND** neither page renders a second breadcrumb row, dropdown, or title
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

The template page SHALL declare Clear variables and Clear all as its dropdown
options. The text editor page SHALL declare Clear editor. The markdown editor
page SHALL declare Clear editor. A page SHALL offer no option that it does not
implement.

#### Scenario: Template page options

- **WHEN** the user opens the template page and activates the Options dropdown
- **THEN** Clear variables and Clear all are listed

#### Scenario: Text editor page options

- **WHEN** the user opens the text editor page and activates the Options dropdown
- **THEN** Clear editor is listed
- **AND** no variable-related option is listed

#### Scenario: Markdown editor page options

- **WHEN** the user opens the markdown editor page and activates the Options
  dropdown
- **THEN** Clear editor is listed

### Requirement: The title textbox validates the entered title

Every adopting page SHALL render a title textbox in the header row with the
placeholder `"DevToolKit"`. A title that is empty, whitespace-only, or matches
the default placeholder (case-insensitive) SHALL NOT be considered valid. Editing
the title SHALL update `document.title` to the entered value; an empty or invalid
title SHALL fall back to the default page title `Devtoolkit`.

#### Scenario: Editing the title updates the tab title

- **WHEN** the user types a new value into the title textbox
- **THEN** `document.title` becomes that value

#### Scenario: The title is restored on reload

- **WHEN** the user reloads the page after a titled session has been saved
- **THEN** the title textbox shows the stored title (disabled)
- **AND** `document.title` shows the stored title

#### Scenario: Invalid title falls back to the default

- **WHEN** the user clears the title textbox or enters the default placeholder
- **THEN** `document.title` becomes `Devtoolkit`

### Requirement: The title becomes immutable after save

Once a valid title is saved and the session is persisted, the title input SHALL
be set to `disabled="true"` and SHALL NOT be editable for the lifetime of that
session.

#### Scenario: Title becomes disabled after save

- **WHEN** a valid title is provided and the session is saved
- **THEN** the title input is disabled and cannot be edited

### Requirement: The title is scoped to the current page

The title textbox SHALL read and write the title of the session for the current
page type and SHALL NOT change the title shown by any other page type.

#### Scenario: Renaming one page does not rename another page

- **WHEN** the user sets a title on the text editor
- **THEN** the template and markdown editor pages keep their own titles
