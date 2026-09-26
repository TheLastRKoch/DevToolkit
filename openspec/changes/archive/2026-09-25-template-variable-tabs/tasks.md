# Tasks

## 1. Session synchronization behavior

- [x] 1.1 Update template session persistence so ordinary template edits and session reads do not create variables, while an explicit synchronization request adds each newly detected valid token without changing existing values; verify with focused server tests for reads, edits, explicit synchronization, repeated synchronization, and invalid tokens.
- [x] 1.2 Preserve clear-variable, clear-all, variable-update, and rendering behavior after synchronization changes; verify the existing `npm test` suite passes.

## 2. Template session layout

- [x] 2.1 Move the title field and New session control from the navbar into the existing session controls area beside Clear variables and Clear all, preserving element IDs and accessible labels; verify the rendered HTML contains one grouped controls area and no title/session controls in the navbar.
- [x] 2.2 Replace the separate Template and Variables columns with an accessible two-tab editor section, selecting Template initially and keeping rendered output separate; verify keyboard-accessible tab activation shows exactly one editor panel at a time.

## 3. Deferred variable interaction

- [x] 3.1 Update client tab handling so entering Variables from Template sends the explicit synchronization request before rendering the Variables panel, while typing on Template only saves text; verify a newly typed token is absent before the transition and present with an empty value after it.
- [x] 3.2 Preserve variable values and avoid duplicate controls across repeated tab switches, including request failure handling; verify existing values survive transitions and failed synchronization is surfaced without presenting stale success state.

## 4. Integration verification

- [x] 4.1 Run the project test suite and validate the OpenSpec change with `openspec validate --change "template-variable-tabs" --strict`; verify all required artifacts and scenarios are accepted.
