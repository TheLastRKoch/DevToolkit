# Design

## Context

See `proposal.md` - Why. Every editing page already declares the favicon in its
document head with the absolute URL `/static/img/favicon.ico`, except
`public/template.html`. Pages are served from two route shapes: top-level
(`/template`) and nested sessions (`/template/<id>`). A relative URL such as
`static/img/favicon.ico` resolves against the nested path on a session route and
would 404 there, which is why the other pages use the absolute form.

## Goals / Non-Goals

**Goals:**

- The Template page shows the DevToolkit favicon on both `/template` and
  `/template/<id>`.
- The favicon declaration matches the one the other pages already use, so there
  is a single form to copy for future pages.

**Non-Goals:**

- Redesigning the favicon or adding alternate icon formats
  (`apple-touch-icon`, manifest icons).
- Changing the favicon asset, its path, or how static files are served.
- Changing any Template page behavior, layout, or session logic.

## Decisions

- **Use the absolute `/static/img/favicon.ico` URL, not a relative path.**
  The page is served at both `/template` and `/template/<id>`; only an absolute
  URL resolves correctly from both. This matches every other page and the
  existing assertions in `test/routes.test.js`.
- **Add the declaration directly to the page head instead of injecting it from
  a script.** The other pages declare it in HTML; a client-side injection would
  add a request-ordering dependency and would not be visible to a server-side
  body assertion.
- **Capture the behavior as the `page-favicon` capability rather than folding it
  into an existing spec.** No current capability describes document head assets,
  and a page-wide requirement is durable: future pages inherit the obligation
  instead of each page spec repeating it.

## Risks / Trade-offs

- [The requirement is only enforced by the route tests, so a new page could skip
  it] → The spec states the page-wide obligation and the tasks extend the shared
  page assertions; reviewers check new pages against it.
- [The favicon is requested on every page load, adding one small request] →
  Negligible; browsers cache the icon.
