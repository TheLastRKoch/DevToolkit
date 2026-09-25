# Dynamic template sessions

Open `/template` to start session 1. Each session has an isolated in-memory
template and is addressable at `/template/<session-id>`. Use **New session** to
open the next session in a new browser tab.

Template variables use the case-sensitive syntax `@[variable_name]`, where the
name may contain letters, numbers, underscores, or hyphens. Enter values in the
Variables panel to replace every occurrence in the rendered output. Empty
variables remain visible as their original token. **Clear variables** removes
the variable values while preserving the template; **Clear all** removes both.

The **Title** field in the upper-left header updates the browser tab title for
the current session. Editing the template, a variable, or the title marks the
session as dirty and enables the browser's native “Leave site?” confirmation
when closing, refreshing, or navigating away.
