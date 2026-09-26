# Design

## Context

The template session editor currently splits the screen unevenly, with the editor tab column taking `col-md-6` and the rendered output taking `col-md-3`, leaving 3 grid columns unoccupied. In addition, variables are rendered as separate HTML labels and inputs, which makes viewing or editing multiple variables cumbersome and creates confusion when variables are not immediately visible or saved. Furthermore, synchronization and rendering were previously executed during typing or tab transitions. See `proposal.md` and `specs/template-session-editor/spec.md`.

## Goals / Non-Goals

**Goals:**

- Balance the layout so both the editor column (template/variables) and the output column take 6 grid columns (`col-md-6`), filling the horizontal space cleanly.
- Render and edit session variables within a single textarea in the format `@[variable-name]=variable content`.
- Parse multi-line variable definitions and update session state when editing the variables textarea.
- Trigger token extraction and variable addition/synchronization strictly on template textarea blur.
- Trigger template rendering strictly when the output textarea receives focus.
- Preserve unsaved change dirty-tracking and session isolation.

**Non-Goals:**

- Modifying the underlying token format (`@[a-zA-Z0-9_-]+`).
- Changing server-side session routing or lifetime rules.
- Introducing a database or external persistent store.

## Decisions

1. **Equal-width column layout with Bootstrap grid.**
   Update the output section in `public/template.html` from `col-md-3` to `col-md-6`. This aligns with the `col-md-6` editor column and consumes the entire 12-column grid row.

2. **Single textarea for variable editing.**
   Inside `#variablesPanel`, replace the dynamic wrapper with a single `textarea` (`#txtVariables`) using monospace font.
   The serialization format is:
   ```
   @[key1]=value1
   @[key2]=value2
   ```
   When synchronizing, the application serializes session variables into this format. When the user edits `#txtVariables` and blurs, each line matching `/^@\[([a-zA-Z0-9_-]+)\]=(.*)$/` is parsed and sent to the server.

3. **Event-driven synchronization and rendering lifecycle.**
   - Template blur (`txtInput.addEventListener('blur', ...)`): Sends a request with the current template text and a flag to synchronize detected tokens. New tokens are added with empty string values, existing values are preserved, and the variables textarea is updated.
   - Output focus (`txtOutput.addEventListener('focus', ...)`): Fetches the rendered template from the server (or requests render with current state) and populates `#txtOutput`.
   - Variables blur (`txtVariables.addEventListener('blur', ...)`): Sends updated variable key-value pairs to the session endpoint so variables are saved.

4. **Batch variable update API support.**
   Ensure the server endpoint (e.g. `PATCH /api/template/:sessionId` or `PUT /api/template/:sessionId/variables`) accepts batch variable updates so the multi-line text format can be updated in a single transaction.

## Risks / Trade-offs

- [Risk] User enters invalid format lines in the variables textarea. → Mitigation: Ignore or preserve unrecognized lines, or ignore lines not matching `@[key]=value`, while only updating valid variable keys.
- [Risk] User forgets to blur before clicking outside or leaving. → Mitigation: Unsaved changes prompt (`beforeunload`) continues to flag dirty state if template or variables were typed in.
- [Risk] Output is not rendered until focused. → Mitigation: Explicitly document and implement the focus trigger on `#txtOutput`, while also ensuring initial session load renders baseline output if desired or waits for user focus.

## Migration Plan

Deploy the HTML/CSS layout change, JavaScript event handlers, and API updates together. No database migration is needed as sessions are in-memory.
