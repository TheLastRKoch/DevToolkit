# Spec Delta

## Purpose

Defines the layout and interactive behavior of the Markdown Editor page, ensuring both panes render at equal height and equal half-width in split view, with responsive 200px margins on desktop/tablet, and that per-pane expand controls correctly hide the opposite pane.

## ADDED Requirements

### Requirement: Equal-height editor and preview panes
Both the raw-markdown pane (`#rawPane`) and the rendered-preview pane (`#previewPane`) SHALL occupy the same height within the editor workspace (`#editorWorkspace`) when the split view is active.

#### Scenario: Status bar does not reduce editor pane height
- **WHEN** the user loads the markdown editor in split view
- **THEN** the `#mdInput` textarea SHALL be visually the same height as the `#mdPreview` container

#### Scenario: Adding a status bar does not shrink the textarea
- **WHEN** a character-count status bar is present in the raw pane
- **THEN** the layout SHALL account for the status bar so that the textarea's effective height matches the preview pane's content area height

### Requirement: Expand editor hides preview pane
Clicking the expand (`[]`) button in the raw-markdown pane SHALL hide the preview pane and its divider, giving the editor full horizontal width.

#### Scenario: Editor expands to full width
- **WHEN** the user clicks the `[]` button in the raw-markdown pane toolbar
- **THEN** the preview pane (`#previewPane`) SHALL NOT be visible
- **AND** the pane dividers SHALL NOT be visible
- **AND** the raw-markdown textarea SHALL occupy the full width of the editor workspace

#### Scenario: Editor restore returns to split view
- **WHEN** the editor is in full-width mode and the user clicks the `[]` button again
- **THEN** both panes SHALL be visible side by side
- **AND** the pane divider SHALL be visible

### Requirement: Expand preview hides raw-markdown pane
Clicking the expand (`[]`) button in the preview pane SHALL hide the raw-markdown pane and its divider, giving the preview full horizontal width.

#### Scenario: Preview expands to full width
- **WHEN** the user clicks the `[]` button in the preview pane toolbar
- **THEN** the raw-markdown pane (`#rawPane`) SHALL NOT be visible
- **AND** the pane dividers SHALL NOT be visible
- **AND** the preview container SHALL occupy the full width of the editor workspace

#### Scenario: Preview restore returns to split view
- **WHEN** the preview is in full-width mode and the user clicks the `[]` button again
- **THEN** both panes SHALL be visible side by side
- **AND** the pane divider SHALL be visible

### Requirement: Symmetrical half-screen split and responsive horizontal margins
The editor workspace SHALL be configured with a 200px margin on both the left and right edges when viewed on tablet and desktop screens (viewport width >= 768px), and SHALL NOT have 200px margins on mobile screens (< 768px). When split view is active, both `#rawPane` and `#previewPane` SHALL share equal halves (50%) of the workspace width.

#### Scenario: Workspace margin in desktop and tablet mode
- **WHEN** the markdown editor page is loaded on a screen with viewport width >= 768px
- **THEN** the editor workspace SHALL have a 200px margin on the left and right

#### Scenario: Workspace margin in mobile mode
- **WHEN** the markdown editor page is loaded on a screen with viewport width < 768px
- **THEN** the editor workspace SHALL NOT have 200px margins on the left and right

#### Scenario: Equal 50/50 split width
- **WHEN** split view is active
- **THEN** `#rawPane` and `#previewPane` SHALL each occupy 50% of the editor workspace width
