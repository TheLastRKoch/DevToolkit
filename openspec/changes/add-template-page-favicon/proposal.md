# Proposal

## Why

The Template page (`/template`) renders without the DevToolkit favicon, so the
browser tab shows a generic page icon while every other editing page shows the
app icon. The page head omits the `<link rel="icon">` declaration that the other
pages carry, which makes the app look unfinished and breaks the visual
continuity between pages.

## What Changes

- Add the shared favicon declaration to the Template page head, using the
  absolute `/static/img/favicon.ico` URL that the other editing pages use so it
  also resolves from nested session routes such as `/template/3`.
- Establish the favicon declaration as a page-wide requirement, so every page
  the application serves advertises the same icon and a newly added page cannot
  silently ship without one.
- Extend the page tests so the Template page, including its nested session
  route, is asserted to reference the absolute favicon URL that actually
  resolves with status `200`.

No visual layout, session behavior, or editing behavior changes; the only
observable difference is the browser tab icon on the Template page.

## Capabilities

### New Capabilities

- `page-favicon`: every page the application serves declares the DevToolkit
  favicon at the absolute `/static/img/favicon.ico` URL, including from nested
  session routes.

### Modified Capabilities

<!-- None: no existing requirement changes. The Template page's documented
     behavior does not currently mention page assets, and the favicon
     requirement is introduced as its own capability. -->

## Impact

- `public/template.html`: add the `<link rel="icon" type="image/x-icon"
  href="/static/img/favicon.ico">` declaration to the document head.
- `test/routes.test.js`: assert the Template page and `/template/<id>` reference
  the absolute favicon URL and that the asset resolves.
- No server, dependency, session, or documentation behavior changes beyond
  recording the favicon requirement in the new capability spec.
