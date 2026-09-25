# Design

## Context

The template page currently renders title and New session controls in the
navbar, renders Template and Variables as separate columns, and synchronizes
tokens into the session variable map while text is edited and while session
state is serialized. See `proposal.md` for the motivation and
`specs/template-session-editor/spec.md` for the observable contract.

## Goals / Non-Goals

**Goals:**

- Keep the change limited to the template page layout, client tab state, and
  the point at which token synchronization is requested.
- Make tab transitions accessible through standard Bootstrap tab markup and
  preserve direct keyboard activation.
- Ensure session reads and template edits do not implicitly create variables.
- Preserve current APIs, session persistence, rendering, clear actions, and
  new-session behavior.

**Non-Goals:**

- Redesigning the navbar, rendered-output editor, or session data model.
- Changing token syntax, variable validation, variable deletion, or rendering
  semantics.
- Adding client-side routing or a new UI framework.

## Decisions

1. **Use a single tabbed editor region.** Template and Variables will share the
   existing editor column and be toggled with Bootstrap-compatible tab buttons
   and panels. This keeps the layout change small and uses the page's existing
   Bootstrap dependency; separate routes or a custom tab component would add
   complexity without changing the behavior contract.

2. **Move all four session actions into one controls row.** The title field and
   New session action will be moved beside the existing clear actions below the
   breadcrumb. This preserves their existing element IDs and handlers while
   making the requested grouping a markup/layout change rather than an API
   change.

3. **Make variable synchronization explicit on the tab transition.** The
   client will use the existing session update flow with an explicit
   synchronization signal when the user changes from Template to Variables,
   then render the returned session state. Ordinary template updates will
   persist text without that signal. Server serialization will be side-effect
   free with respect to variable creation. This avoids a new endpoint while
   making the user-triggered boundary observable and preventing background
   reads from mutating sessions.

4. **Retain the existing token extractor and variable API.** Synchronization
   will continue to use the existing supported token format and preserve
   existing variable values. No new token grammar or data migration is needed.

## Risks / Trade-offs

- [Risk] A user can leave the page with unsynchronized tokens in the template
  text. → This is intentional per the requirement; the Variables tab is the
  explicit point at which variables become available.
- [Risk] A tab transition request can fail and leave the Variables panel
  stale. → Surface the existing request error path and only render the
  synchronized state after a successful response.
- [Risk] Removing synchronization from serialization changes implicit server
  mutation behavior. → Cover reads, text edits, tab entry, and repeated tab
  entry with focused tests and preserve explicit clear/variable-update
  endpoints.

## Migration Plan

No data migration is required. Deploy the markup/client/server behavior
together; rolling back restores the previous implicit synchronization behavior
and does not require a session-data conversion.
