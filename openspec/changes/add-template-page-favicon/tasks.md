# Tasks

## 1. Declare the favicon on the Template page

- [x] 1.1 Add `<link rel="icon" type="image/x-icon" href="/static/img/favicon.ico">` to the head of `public/template.html`, matching the declaration the other editing pages use, and verify the file contains exactly one favicon link with the absolute URL.

## 2. Cover the declaration with page tests

- [x] 2.1 Extend the `GET /template returns the template page` test in `test/routes.test.js` to assert the body contains `href="/static/img/favicon.ico"` and does not contain a relative `href="static/img/favicon.ico"`, then verify `npm test` passes that test.
- [x] 2.2 Include `/template/3` in the nested session route assertions so the session route is verified to declare the absolute favicon URL, and verify the favicon asset itself still resolves with status `200` in that test.
- [x] 2.3 Run `npm test` and confirm the full suite passes, including the existing favicon assertions for the other pages.

## 3. Confirm the requirement end to end

- [x] 3.1 Start the server (`node server.js`) and request `/template` and `/template/3`, confirming both responses declare the favicon at `/static/img/favicon.ico` and that the asset returns status `200`; then run `openspec validate add-template-page-favicon --strict` and confirm it passes.

## Workflow follow-up

- Archive the change after review is complete.
