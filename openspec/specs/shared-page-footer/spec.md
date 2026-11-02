# shared-page-footer Specification

## Purpose
Defines the standard application footer across DevToolkit pages, specifying the GitHub project repository link and sticky bottom viewport positioning on the home page.

## Requirements

### Requirement: Standard footer with GitHub project link
The application footer across DevToolkit pages (`/`, `/markdown-editor`, `/template`, `/text-editor`) SHALL display the text `DevToolKit fork me on github`, where `github` is a hyperlink pointing to `https://github.com/TheLastRKoch/devtoolkit`.

#### Scenario: Footer link is present on all pages
- **WHEN** the user views any DevToolkit page
- **THEN** the footer displays "DevToolKit fork me on github"
- **AND** "github" links to `https://github.com/TheLastRKoch/devtoolkit`

#### Scenario: Legacy copyright text is replaced
- **WHEN** the user views the footer on any page
- **THEN** the text "All rights reserved." and the copyright symbol are not displayed in the footer

### Requirement: Sticky footer layout on home page
The home page (`/`) SHALL structure its document body and main content container so that the footer is positioned at the bottom of the viewport when content does not fill the screen.

#### Scenario: Home page footer rests at bottom with sparse content
- **WHEN** the user loads the home page (`/`) with an empty or short gallery
- **THEN** the footer is anchored at the bottom of the viewport
- **AND** the footer does not float directly below sparse content in the middle of the viewport
