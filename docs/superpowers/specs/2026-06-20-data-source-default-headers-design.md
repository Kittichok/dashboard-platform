# Data Source Default Headers Design

## Summary

Extend the shared REST API Source feature so a data source can store both structured authentication and a reusable default header map. New data sources start with `Content-Type: application/json`, but users may edit or remove it. Deliver a static HTML preview artifact that shows the intended UI state without adding a second live implementation surface.

## Goals

- Let users define reusable non-auth headers on a shared REST API Source.
- Keep authentication structured and separate from ordinary headers.
- Seed new REST API Sources with `Content-Type: application/json`.
- Preserve the full configuration through create, edit, import, and export flows.
- Provide a static HTML preview that demonstrates the new dialog and card presentation.

## Non-Goals

- No change to table widget data sources.
- No new authentication types.
- No dedicated live preview inside the React app for this iteration.
- No special backend-only content-type field outside the general headers map.

## Current State

The current data source model stores:

- `baseUrl`
- `authentication`

The UI allows users to create and edit those fields, and import/export persists the same shape. There is no place to define shared default headers such as `Content-Type` or `Accept`.

## Proposed Design

### Data Model

Add `headers` to the REST data source config shape:

```json
{
  "name": "Orders API",
  "type": "rest",
  "config": {
    "baseUrl": "https://api.example.test",
    "authentication": {
      "type": "api_key_header",
      "headerName": "X-API-Key",
      "value": "secret"
    },
    "headers": {
      "Content-Type": "application/json",
      "Accept": "application/json"
    }
  }
}
```

This keeps authentication explicit while supporting any number of reusable shared headers.

### Default Behavior

When a user creates a new REST API Source, the frontend seeds:

```json
{
  "Content-Type": "application/json"
}
```

This default is editable and removable. It is not enforced after creation.

### Header Merge Rules

Runtime fetch behavior composes headers in this order:

1. Authentication-derived header, if any
2. Data source default headers
3. Widget request headers

Conflict handling:

- Authentication header names are reserved and cannot be overridden by default headers or widget headers.
- Widget request headers override ordinary default headers when names match.
- Header name comparisons should be case-insensitive for collision checks.

### Validation Rules

Backend and frontend validation should agree on these constraints:

- Header names must be non-blank.
- Duplicate header names are invalid when compared case-insensitively.
- Header values must be non-blank.
- Existing authentication validation remains unchanged.

### Import And Export

Import and export continue to use the same JSON contract as the stored config. The only schema addition is `config.headers`.

This ensures:

- imported files can define reusable headers
- exported files round-trip without loss
- old imports without `headers` remain compatible and should be treated as empty headers

## UI Changes

### Data Source Dialog

Update the create/edit dialog to include a “Default Headers” editor:

- render one row per header
- support add row
- support remove row
- prefill `Content-Type: application/json` for newly created REST API Sources
- show inline validation for blank names and duplicate names

The authentication section remains separate and unchanged in structure.

### Data Source Library Cards

Add a compact summary of configured default headers to each card:

- show the first one or two headers inline
- if more remain, show a `+N more` style summary

This gives users a quick way to distinguish similar sources without opening the dialog.

## Static HTML Preview

Create a standalone HTML file that demonstrates the approved UI state. It is presentation-only and does not need app logic.

The preview should show:

- the create/edit dialog
- the authentication section
- the default headers editor with `Content-Type: application/json` already present
- an example list/card view with header summary
- a sample import/export JSON block

Preferred location is near existing docs preview artifacts so it is easy to inspect during review.

## Backend Impact

Backend work should remain narrow:

- extend REST config parsing and validation to include `headers`
- preserve the new field in create, update, import, export, and fetch composition
- treat missing `headers` as an empty map for backward compatibility

No database schema change is required if the data source config remains stored as JSON text.

## Frontend Impact

Frontend work includes:

- extend TypeScript types with `headers`
- seed default headers for new sources
- render editable header rows in the dialog
- preserve headers in API requests and responses
- expose a compact header summary in the library view

## Testing Strategy

### Backend

- validate import/export round-trip with `headers`
- validate backward compatibility when `headers` is missing
- validate collision rules involving authentication headers and widget headers

### Frontend

- verify new data source creation starts with `Content-Type: application/json`
- verify users can edit and remove the default header
- verify duplicate header names are rejected case-insensitively
- verify import/export includes `headers`
- verify card summary renders configured headers

### Preview Artifact

- verify the HTML file exists and reflects the approved UI structure

## Risks And Mitigations

- Header collision behavior may be confusing if it differs between backend and frontend.
  Mitigation: define one shared rule set in the spec and test both layers.
- Case sensitivity can create duplicate-looking headers.
  Mitigation: normalize comparisons case-insensitively during validation.
- Users may assume `Content-Type` is enforced permanently.
  Mitigation: treat it as a seeded default only and keep it visibly editable.

## Success Criteria

- A user can create a shared REST API Source with reusable default headers.
- New sources start with `Content-Type: application/json`.
- Import and export preserve `headers`.
- Widgets continue to use selected data sources, with runtime header merge behavior matching the documented rules.
- Reviewers can open a static HTML file and see the intended UI state clearly.
