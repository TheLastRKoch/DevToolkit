# Proposal

## Why

The template session page currently distributes session controls across the navbar and the content area, while Template and Variables compete for separate columns. This makes the primary editing workflow less cohesive and causes variables to appear as soon as tokens are typed, before the user has chosen to work with them.

## What Changes

- Move the title input and New session control out of the navbar and place them beside Clear variables and Clear all in the session controls area.
- Combine the Template and Variables panels into one tabbed section with Template and Variables tabs.
- Keep the rendered output panel available alongside the combined editor section.
- Defer creation of newly detected variables until the user switches from the Template tab to the Variables tab.
- Preserve existing session, title, clear, variable editing, rendering, and new-session behavior except for the revised layout and deferred variable synchronization.

## Capabilities

### New Capabilities

- `template-session-editor`: Provides the tabbed template/variables editing experience, session control placement, and tab-driven variable synchronization.

### Modified Capabilities

None.

## Impact

- `public/template.html`: session control placement and tabbed editor markup.
- `public/static/scripts/template.js`: tab state, tab transition handling, and deferred variable synchronization.
- Existing template session APIs remain in use; no new dependency or server endpoint is required. The session update flow may gain an explicit synchronization option for the tab transition.
- Browser-level behavior and any UI tests covering the template session page may need updates or additions.
