# Tasks

## 1. Layout and Markup Updates

- [ ] 1.1 Update `public/template.html` so the output section column class is `col-md-6` instead of `col-md-3`, ensuring the template/variables section and the output section each cover equal halves of the screen; verify layout spans the full 12-column grid row without empty columns.
- [ ] 1.2 Replace the dynamic variable fields container in `#variablesPanel` with a monospace textarea element (`#txtVariables`); verify the textarea renders with full height when the Variables tab is active.

## 2. Server Variable Batching and Synchronization

- [ ] 2.1 Update `server.js` to support batch variable synchronization and updates on session update endpoints (e.g. `PATCH /api/template/:sessionId`); verify with tests that valid tokens are added, existing values are preserved, and provided variable key-values are stored.
- [ ] 2.2 Add unit and route tests in `test/template.test.js` covering batch variable persistence, empty variable preservation, and rendered output generation.

## 3. Client Interaction and Event Triggers

- [ ] 3.1 Implement serialization and parsing between session variables and the `@[variable-name]=variable content` multi-line text format in `public/static/scripts/template.js`; verify variables are populated in `#txtVariables` line-by-line and edits are parsed accurately into key-value pairs.
- [ ] 3.2 Implement the blur event trigger on the template textarea (`#txtInput`) to add new tokens and update session variables when focus is lost; verify newly typed tokens are not added during active typing but appear in variables after blur.
- [ ] 3.3 Implement the focus event trigger on the output textarea (`#txtOutput`) to render the populated template; verify the output textarea only renders when focused.
- [ ] 3.4 Implement blur / change handling on `#txtVariables` to persist variable edits to the session; verify variable values are saved and correctly reflected upon subsequent operations.

## 4. Verification and Documentation

- [ ] 4.1 Update `docs/template.md` to document the equal-width layout, the multi-line variable textarea format, template blur synchronization, and output focus rendering; verify documentation matches the implemented behaviors.
- [ ] 4.2 Run test suite with `npm test` and validate OpenSpec artifacts with `openspec validate template-variable-editor-updates`; verify all tests pass and the change proposal is valid.
