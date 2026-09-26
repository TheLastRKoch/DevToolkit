# Spec Delta

## ADDED Requirements

### Requirement: Favicon is loaded on template sessions

The template session page SHALL reference the site favicon at the root-relative path `/static/img/favicon.ico` within the document `<head>`, ensuring that the favicon loads reliably under all `/template/:sessionId` routes without relative path resolution errors.

#### Scenario: User accesses a template session route

- **WHEN** the user navigates to `/template` or any `/template/:sessionId` route
- **THEN** the served HTML document contains a `<link rel="icon" type="image/x-icon" href="/static/img/favicon.ico">` element
- **AND** the browser successfully resolves and retrieves the favicon asset from `/static/img/favicon.ico`
