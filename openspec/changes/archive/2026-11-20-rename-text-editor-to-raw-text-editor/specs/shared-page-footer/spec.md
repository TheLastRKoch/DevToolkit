# Spec Delta

## MODIFIED Requirements

### Requirement: Standard footer with GitHub project link

The application footer across DevToolkit pages (`/`, `/markdown-editor`,
`/template`, `/raw-text-editor`) SHALL display the text `DevToolKit fork me on
github`, where `github` is a hyperlink pointing to
`https://github.com/TheLastRKoch/devtoolkit`.

#### Scenario: Footer link is present on all pages

- **WHEN** the user views any DevToolkit page
- **THEN** the footer displays "DevToolKit fork me on github"
- **AND** "github" links to `https://github.com/TheLastRKoch/devtoolkit`

#### Scenario: Legacy copyright text is replaced

- **WHEN** the user views the footer on any page
- **THEN** the text "All rights reserved." and the copyright symbol are not displayed in the footer
