# Dynamic template sessions

Open `/template` to start session 1. Each session has an isolated in-memory
template and is addressable at `/template/<session-id>`. Use **New session** to
open the next session in a new browser tab.

## Layout

The page layout splits the screen equally into two 6-column sections (`col-md-6`),
consuming the full 12-column grid row:
- **Editor column (left)**: Contains the tabbed interface switching between the
  **Template** input and the **Variables** editor.
- **Output column (right)**: Contains the rendered template output.

## Variables and Syntax

Template variables use the case-sensitive syntax `@[variable_name]`, where the
name may contain letters, numbers, underscores, or hyphens.

Session variables are displayed and edited within a single multi-line monospace
textarea in the Variables tab using the line-by-line format:
```text
@[variable-name]=variable content
```
Empty variables are represented as `@[variable-name]=`. Editing this textarea and
blurring persists the parsed key-value pairs back to the session.

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

- **Title**: Updates the browser tab title for the current session.
- **Clear variables**: Removes all variable values while preserving the template text.
- **Clear all**: Resets both template text and all variables.
- **Unsaved changes**: Editing the template, variables, or title marks the session
  as dirty and enables the browser's native “Leave site?” confirmation when closing,
  refreshing, or navigating away.
