# Design

## Context

See proposal.md - Why.
The template page HTML is served statically by Express (`public/template.html`). When a user accesses `/template`, the server redirects them to `/template/:sessionId`. In commit `2ddf4a65b6ff8ba3806c34f4bff7da20b0b5424a`, the favicon link was accidentally removed from `public/template.html`. Using a relative path like `href="static/img/favicon.ico"` fails on `/template/:sessionId` because the browser evaluates it relative to the subpath (`/template/static/img/favicon.ico`), which is not mapped in Express.

## Goals / Non-Goals

**Goals:**
- Restore the favicon `<link>` tag in `public/template.html` using a root-relative path `/static/img/favicon.ico`.
- Ensure tests verify that the template page references `/static/img/favicon.ico` and that the static asset returns HTTP 200.

**Non-Goals:**
- Modifying Express routing or adding server-side `/favicon.ico` redirects in this bug fix.
- Modifying other pages (`index.html`, `editor.html`) that are currently functioning.

## Decisions

### Decision: Root-relative path (`/static/img/favicon.ico`)
- **Rationale**: The template page is served under `/template/:sessionId` (e.g. `/template/1`). A relative path `static/...` resolves to `/template/static/...` resulting in a 404 error. A root-relative path `/static/...` correctly resolves to `http://<host>:<port>/static/img/favicon.ico` mapped by Express static middleware.
- **Alternatives considered**:
  - Relative path `static/img/favicon.ico`: Fails under `/template/:sessionId`.
  - Base tag `<base href="/">`: Can introduce unexpected side effects on anchor links or fragment identifiers.

## Risks / Trade-offs

- [Risk] Missing root-relative leading slash → [Mitigation] Automated test in `test/template.test.js` asserting that `GET /template/1` contains `href="/static/img/favicon.ico"` and that `GET /static/img/favicon.ico` returns 200 OK.
