# markdown-editor-page Specification

## Purpose
Defines page-level layout requirements for the Markdown Editor page, ensuring adequate vertical separation between the shared page header controls and the editor workspace panes.

## Requirements

### Requirement: Vertical separation between page header and editor workspace
The markdown editor page (`/markdown-editor`) SHALL provide vertical separation between the shared page header row (`#pageHeader`) and the editor workspace container (`#editorWorkspace`), ensuring the options dropdown and title input do not visually touch or stick to the top border of the editor panes.

#### Scenario: Spacing separates header from editor panes
- **WHEN** the user views the `/markdown-editor` page on mobile, tablet, or desktop viewports
- **THEN** vertical margin space exists between the bottom of the shared page header row and the top of `#editorWorkspace`
- **AND** the options toggle and title input are visually separated from the raw markdown textarea and preview pane
