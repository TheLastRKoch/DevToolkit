# Proposal

## Why

The `/template` endpoint currently fails to display the site favicon (`favicon.ico`). During the implementation of session-scoped template editing and dynamic title updates, the `<link rel="icon">` element was inadvertently removed from `public/template.html`. Furthermore, because template sessions are accessed at subpaths such as `/template/:sessionId`, using a relative URL (`href="static/img/favicon.ico"`) causes the browser to resolve requests to `/template/static/img/favicon.ico`, resulting in HTTP 404 errors. This change restores the favicon link using a root-relative path (`/static/img/favicon.ico`) and ensures reliable favicon loading across all session routes.

## What Changes

- Restore the favicon `<link>` element in the `<head>` of `public/template.html`.
- Use a root-relative URL (`/static/img/favicon.ico`) so that subpath session routes (e.g., `/template/1`) correctly resolve the asset.
- Add test coverage in `test/template.test.js` to verify that template pages link to the favicon and that the static favicon asset is served successfully.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `template-session-editor`: Add requirement that the template session page includes the favicon link with a root-relative path to ensure the favicon loads properly on all session routes.

## Impact

- `public/template.html`: `<head>` element updated with `<link rel="icon" type="image/x-icon" href="/static/img/favicon.ico">`.
- `test/template.test.js`: New test asserting that `GET /template/:sessionId` contains the favicon link and `GET /static/img/favicon.ico` returns 200 OK.
- No breaking changes or API schema modifications.
