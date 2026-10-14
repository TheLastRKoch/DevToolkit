# Dynamic template sessions

Open `/template` to start session 1. Every session is stored in the browser and
is addressable at `/template/<session-id>`. Use **New session** from the Options
menu to open the next session in a new browser tab.

Sessions live in this browser's `localStorage`, not in the server process:

- Session state survives page reloads, browser restarts, and application server
  restarts, and does not require any request to the server to load.
- Each session expires 30 days after its last change. Editing a session restarts
  its lifetime; an expired session opens as a fresh one named `Devtoolkit`.
- If browser storage is unavailable or a write fails, the change stays visible on
  the page and the header reports that changes will not be persisted.

The `/api/template/*` endpoints and their in-memory server sessions still exist
for existing clients, but the template page does not use them.

## Layout

The page layout splits the screen equally into two 6-column sections (`col-md-6`),
consuming the full 12-column grid row:
- **Editor column (left)**: Contains the tabbed interface switching between the
  **Template** input and the **Variables** editor.
- **Output column (right)**: Contains the rendered template output.

Above both columns, the shared page header (see [Editing pages](pages.md)) renders
the breadcrumb, the Options menu, and the page name textbox in one row.

## Variables and Syntax

Template variables use the case-sensitive syntax `@[variable_name]`, where the
name may contain letters, numbers, underscores, or hyphens.

Session variables are displayed and edited within a single multi-line monospace
textarea in the Variables tab using the line-by-line format:
```text
@[variable-name]=variable content
```
Empty variables are represented as `@[variable-name]=`. Editing this textarea
updates the stored session variables.

## Event Triggers and Synchronization

- **Template blur (`blur`)**: When the template textarea loses focus, newly
  detected tokens are added to session variables with empty string values while
  existing variable values are preserved. Variable addition does not occur while
  actively typing inside the template text box.
- **Output focus (`focus`)**: Rendering the populated template into the output
  textarea occurs when the output textarea receives focus. Populated variables
  are replaced with their assigned values, and unassigned tokens remain in raw
  `@[variable-name]` format.

## Controls

The session controls live in the header's Options menu:

- **New session**: Allocates the next session identifier and opens it in a new tab.
- **Clear variables**: Removes all variable values while preserving the template text.
- **Clear all**: Resets both template text and all variables.
- **Page name**: The header textbox updates the browser tab title and is stored as
  the session's name, so it is restored on reload.
- **Unsaved changes**: An edit that has not been written to browser storage yet
  enables the browser's native “Leave site?” confirmation when closing,
  refreshing, or navigating away.
