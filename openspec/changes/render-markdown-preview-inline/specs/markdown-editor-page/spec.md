# Spec Delta

## ADDED Requirements

### Requirement: The rendered markdown preview flows in the page

The `/markdown-editor` page SHALL render the previewed markdown directly in the page flow instead of inside a bordered or independently scrolling panel. The preview SHALL grow with its content, the page SHALL scroll to reveal the whole document, and the preview SHALL NOT add its own border, shadow, card background, or nested scrollbar.

#### Scenario: A long document extends the page

- **WHEN** the user enters markdown long enough to exceed the viewport height
- **THEN** the rendered document is laid out in full within the page
- **AND** the page scrolls to reveal the rest of the document
- **AND** the preview area has no separate scrollbar

#### Scenario: The preview is not enclosed in a boxed panel

- **WHEN** the user views `/markdown-editor`
- **THEN** the rendered markdown is not enclosed in a bordered, shadowed, or background card panel

### Requirement: The raw editor and rendered preview stay side by side

The page SHALL keep the raw markdown editor and the rendered preview visible together in the default split view. On viewports 768 px and wider they SHALL appear side by side; below 768 px they SHALL stack vertically with the raw editor first. Either pane SHALL be expandable to the full page width and restorable to the split view.

#### Scenario: Wide viewports show both panes side by side

- **WHEN** the user opens `/markdown-editor` on a viewport 768 px or wider
- **THEN** the raw markdown editor and the rendered preview are both visible side by side

#### Scenario: Narrow viewports stack the panes

- **WHEN** the user opens `/markdown-editor` on a viewport narrower than 768 px
- **THEN** the raw editor and the rendered preview are stacked vertically with the raw editor first

#### Scenario: Expanding the preview uses the full page width

- **WHEN** the user activates expand on the preview pane
- **THEN** the raw editor is hidden and the rendered document uses the full page width
- **AND** activating restore brings both panes back to the split view

### Requirement: The preview updates live while the user edits

The rendered preview SHALL update as the markdown content changes, without a page reload.

#### Scenario: Typing updates the preview

- **WHEN** the user types or pastes markdown into the raw editor
- **THEN** the rendered preview shows the updated document immediately

#### Scenario: Clearing empties the preview

- **WHEN** the user selects `Clear editor`
- **THEN** the raw editor and the rendered preview are both empty
