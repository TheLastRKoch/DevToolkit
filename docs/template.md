# Dynamic template sessions

Open `/template` to work on the template page's single session. Its text,
variables, and title live in this browser's `localStorage` under
`devtoolkit:sessions:template`, not in the server process.

- Nothing is stored until the session has a **valid custom title** (non-empty,
  not whitespace, not the `DevToolKit` placeholder). Untitled work stays in the
  page view, and leaving with unsaved changes raises the browser's native
  “Leave site?” confirmation.
- Once titled, the session survives page reloads, browser restarts, and
  application server restarts without any request to the server, and the title
  textbox is disabled so the session cannot be renamed.
- The session keeps the last three content snapshots. A snapshot is recorded
  when you leave the tab (or the page unloads) and the template text or the
  variable values changed since the most recent one; unchanged content is not
  snapshotted twice, and a fourth snapshot drops the oldest.

The `/api/template/*` endpoints and their in-memory server sessions still exist
for existing clients, but the template page does not use them.

## Layout

The page layout splits the screen equally into two 6-column sections (`col-md-6`),
consuming the full 12-column grid row:
- **Editor column (left)**: Contains the tabbed interface switching between the
  **Template** input and the **Variables** editor.
- **Output column (right)**: Contains the rendered template output.

Above both columns, the shared page header (see [Editing pages](pages.md)) renders
the Options menu and the title textbox in one row.

## Variables and Syntax

Template variables use the case-sensitive syntax `@[variable_name]`, where the
name may contain letters, numbers, underscores, or hyphens.

Session variables are displayed and edited within a single multi-line monospace
textarea in the Variables tab using the line-by-line format:
```text
@[variable-name]=variable content
```
Empty variables are represented as `@[variable-name]=`. Editing this textarea
updates the session variables.

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

- **Clear variables**: Removes all variable values while preserving the template text.
- **Clear all**: Resets both template text and all variables.
- **Title**: The header textbox updates the browser tab title and is stored as the
  session's title, so it is restored on reload; a saved title is disabled.
