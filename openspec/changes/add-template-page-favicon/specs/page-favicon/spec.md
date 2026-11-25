# Spec Delta

## Purpose

Ensures every page the application serves advertises the DevToolkit favicon, so
browser tabs show the app icon consistently regardless of which page the user
opens.

## ADDED Requirements

### Requirement: Every page declares the favicon

Every page the application serves SHALL declare the DevToolkit favicon in its
document head using the absolute URL `/static/img/favicon.ico`, so the
declaration resolves from both top-level routes and nested session routes.

#### Scenario: The template page declares the favicon

- **WHEN** the user opens `/template`
- **THEN** the served page head declares the icon at `/static/img/favicon.ico`
- **AND** the browser requests that URL and receives status `200`

#### Scenario: Nested session routes resolve the favicon

- **WHEN** the user opens `/template/3`
- **THEN** the served page head declares the icon at `/static/img/favicon.ico`
  with an absolute URL rather than a route-relative one

#### Scenario: Existing pages keep the favicon

- **WHEN** the user opens the home, raw text, markdown, code, or list compare page
- **THEN** each served page declares the icon at `/static/img/favicon.ico`

### Requirement: A missing favicon declaration is detectable

The page tests SHALL assert the favicon declaration on every served page, so a
page that omits the declaration fails the test suite instead of shipping
without an icon.

#### Scenario: A page without the declaration fails

- **WHEN** a served page does not declare `/static/img/favicon.ico` in its head
- **THEN** the page tests report that page as failing the favicon assertion
