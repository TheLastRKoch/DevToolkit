# Proposal

## Why

Currently, the template session page's layout leaves empty space on the right side of the screen because the output column only spans 3 grid columns while the editor column spans 6. Furthermore, variables are rendered as individual labels and text inputs that are prone to synchronization issues and difficult to batch-edit. Additionally, variable extraction and output rendering need clear, predictable event triggers tied to user interaction (template blur and output focus) to avoid premature updates or missed state persistence.

## What Changes

- Expand the rendered output column to cover the remaining width of the screen (`col-md-6`), matching the width of the template and variables editor column.
- Replace the individual label/input variable fields with a single multi-line text box where variables are displayed and edited line-by-line in the format `@[variable-name]=variable content`.
- Update the event triggers so that adding and updating template variables occurs when the template text box loses focus (`blur`).
- Update the event triggers so that rendering the populated template into the output text box occurs when the output text box gains focus (`focus`).
- Remove the previous tab-entry variable synchronization requirement in favor of template blur-driven synchronization.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `template-session-editor`: Updates the output section layout to span the remaining screen width, replaces individual variable inputs with a single formatted text box (`@[variable-name]=variable content`), triggers variable addition/synchronization on template blur, and triggers template rendering on output focus.

## Impact

- `public/template.html`: Adjusts column sizing for the output section (`col-md-6`) and replaces the dynamic list container in the variables tab with a multi-line textarea.
- `public/static/scripts/template.js`: Implements formatting/parsing for the `@[key]=value` variables textarea, attaches blur event on `#txtInput` for variable synchronization, and attaches focus event on `#txtOutput` for rendering.
- `server.js`: Supports batch updating or synchronizing variables from the formatted text representation while preserving session isolation.
- Existing tests in `test/template.test.js` and spec validations.
