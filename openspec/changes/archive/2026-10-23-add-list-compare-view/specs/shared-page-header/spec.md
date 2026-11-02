# Spec Delta

## MODIFIED Requirements

### Requirement: Each adopting page declares its own options

The template page SHALL declare Clear variables and Clear all as its dropdown
options. The text editor page SHALL declare Clear editor. The markdown editor
page SHALL declare Clear editor. The list compare page SHALL declare Clear all. A page SHALL offer no option that it does not
implement.

#### Scenario: Template page options

- **WHEN** the user opens the template page and activates the Options dropdown
- **THEN** Clear variables and Clear all are listed

#### Scenario: Text editor page options

- **WHEN** the user opens the text editor page and activates the Options dropdown
- **THEN** Clear editor is listed
- **AND** no variable-related option is listed

#### Scenario: Markdown editor page options

- **WHEN** the user opens the markdown editor page and activates the Options
  dropdown
- **THEN** Clear editor is listed

#### Scenario: List compare page options

- **WHEN** the user opens the list compare page and activates the Options dropdown
- **THEN** Clear all is listed
