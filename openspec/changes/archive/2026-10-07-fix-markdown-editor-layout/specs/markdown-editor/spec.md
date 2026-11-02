# Spec Delta

## Purpose

Defines the layout and interactive behavior of the Markdown Editor page, ensuring both panes render at equal dimensions in split view, with responsive 200px margins on desktop/tablet, side-by-side 50/50 width on desktop/tablet, stacked top/bottom 50/50 height on mobile, and functional per-pane expand/collapse controls.

## ADDED Requirements

### Requirement: Equal-height editor and preview panes
Both the raw-markdown pane (`#rawPane`) and the rendered-preview pane (`#previewPane`) SHALL occupy the same height within the editor workspace (`#editorWorkspace`) when desktop/tablet split view is active.

#### Scenario: Status bar does not reduce editor pane height
- **WHEN** the user loads the markdown editor in desktop/tablet split view
- **THEN** the `#mdInput` textarea SHALL be visually the same height as the `#mdPreview` container

#### Scenario: Adding a status bar does not shrink the textarea
- **WHEN** a character-count status bar is present in the raw pane
- **THEN** the layout SHALL account for the status bar so that the textarea's effective height matches the preview pane's content area height

### Requirement: Expand editor hides preview pane
Clicking the expand (`[]`) button in the raw-markdown pane SHALL hide the preview pane and its divider, giving the editor full workspace dimensions.

#### Scenario: Editor expands to full width on desktop
- **WHEN** the user clicks the `[]` button in the raw-markdown pane toolbar on desktop/tablet
- **THEN** the preview pane (`#previewPane`) SHALL NOT be visible
- **AND** the pane dividers SHALL NOT be visible
- **AND** the raw-markdown textarea SHALL occupy the full width of the editor workspace

#### Scenario: Editor restore returns to split view
- **WHEN** the editor is in full-pane mode and the user clicks the `[]` button again
- **THEN** both panes SHALL be visible
- **AND** the active pane divider SHALL be visible

### Requirement: Expand preview hides raw-markdown pane
Clicking the expand (`[]`) button in the preview pane SHALL hide the raw-markdown pane and its divider, giving the preview full workspace dimensions.

#### Scenario: Preview expands to full width on desktop
- **WHEN** the user clicks the `[]` button in the preview pane toolbar on desktop/tablet
- **THEN** the raw-markdown pane (`#rawPane`) SHALL NOT be visible
- **AND** the pane dividers SHALL NOT be visible
- **AND** the preview container SHALL occupy the full width of the editor workspace

#### Scenario: Preview restore returns to split view
- **WHEN** the preview is in full-pane mode and the user clicks the `[]` button again
- **THEN** both panes SHALL be visible
- **AND** the active pane divider SHALL be visible

### Requirement: Responsive pane orientation and split sizing
The editor workspace SHALL configure pane orientation and dimensions based on viewport size:
- On tablet and desktop screens (viewport width >= 768px), `#editorWorkspace` SHALL arrange `#rawPane` and `#previewPane` side by side (each occupying 50% width) with 200px margins on left and right.
- On mobile screens (viewport width < 768px), `#editorWorkspace` SHALL stack `#rawPane` on top and `#previewPane` on the bottom (each occupying 50% height and 100% width) with no 200px margins.

#### Scenario: Mobile top and bottom 50/50 split
- **WHEN** the markdown editor page is loaded on a mobile screen (< 768px) in split view
- **THEN** `#editorWorkspace` SHALL arrange panes in a vertical column (top and bottom)
- **AND** `#rawPane` SHALL occupy the top 50% height of `#editorWorkspace`
- **AND** `#previewPane` SHALL occupy the bottom 50% height of `#editorWorkspace`
- **AND** `#paneDividerMobile` SHALL be visible between the panes

#### Scenario: Tablet and desktop side-by-side 50/50 split
- **WHEN** the markdown editor page is loaded on a screen with viewport width >= 768px in split view
- **THEN** `#editorWorkspace` SHALL arrange panes side by side (left and right)
- **AND** `#rawPane` and `#previewPane` SHALL each occupy 50% width of `#editorWorkspace`
- **AND** `#editorWorkspace` SHALL have 200px left and right margins

#### Scenario: Mobile expand and restore
- **WHEN** either pane is expanded via the `[]` button on a mobile screen (< 768px)
- **THEN** the active pane SHALL expand to 100% height of `#editorWorkspace`
- **AND** the opposite pane and `#paneDividerMobile` SHALL NOT be visible
