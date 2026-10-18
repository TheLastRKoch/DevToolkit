# Spec Delta

## Purpose

Provides one reusable page header item — an options dropdown and title textbox
— so every editing page shows the same header row and declares only its own
menu options and title instead of re-implementing the row.

## ADDED Requirements

### Requirement: Pages share one page header item

The application SHALL provide a single reusable page header that renders an
Options dropdown and a title textbox in one row below the navbar. Each page that
adopts the header SHALL supply its own set of dropdown options and its own title
value, and SHALL NOT duplicate the header markup, the dropdown container, or the
title textbox. The header SHALL NOT render a breadcrumb.

#### Scenario: Adopting page declares its own header content

- **WHEN** a page adopts the shared page header with a set of options and a title
- **THEN** the header renders those options and that title in one row below the
  navbar
- **AND** the page contains no separate copy of the dropdown or title markup

#### Scenario: Header structure is identical across pages

- **WHEN** the user opens any two adopting pages
- **THEN** both pages show the Options dropdown and the title textbox in the
  same header row position
- **AND** neither page renders a breadcrumb, a second dropdown, or a title
  textbox elsewhere in its layout

### Requirement: The Options dropdown is centered on desktop

On desktop-width viewports (768 px and wider), the page header SHALL position
the Options dropdown horizontally in the middle of the header row and SHALL keep
the title textbox right-aligned in that row. Below 768 px, the title textbox and
Options dropdown SHALL remain grouped at the end of the row.

#### Scenario: Desktop centers the Options dropdown

- **WHEN** an adopting page is viewed at 768 px or wider
- **THEN** the Options dropdown is horizontally centered in the header row
- **AND** the title textbox is right-aligned in the same row

#### Scenario: Smaller viewports keep the grouped controls

- **WHEN** an adopting page is viewed below 768 px
- **THEN** the title textbox and Options dropdown remain grouped at the end of
  the row

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

### Requirement: The title becomes immutable after focus is lost

The title input SHALL remain editable while it has focus, so the user can type
the complete title. Once the input loses focus with a valid title and the session
is persisted, it SHALL be set to `disabled="true"` and SHALL NOT be editable for
the lifetime of that session.

#### Scenario: Title stays editable while typing

- **WHEN** the user enters a valid title and keeps the title textbox focused
- **THEN** the title input remains enabled and accepts further characters

#### Scenario: Title becomes disabled when focus is lost

- **WHEN** the user finishes entering a valid title and the title textbox loses
  focus
- **THEN** the title input is disabled and cannot be edited

#### Scenario: Invalid title stays editable after focus loss

- **WHEN** the title textbox loses focus with an invalid or empty value
- **THEN** the title input remains enabled

### Requirement: The title is scoped to the current page

The title textbox SHALL read and write the title of the session for the current
page type and SHALL NOT change the title shown by any other page type.

#### Scenario: Renaming one page does not rename another page

- **WHEN** the user sets a title on the text editor
- **THEN** the template and markdown editor pages keep their own titles
