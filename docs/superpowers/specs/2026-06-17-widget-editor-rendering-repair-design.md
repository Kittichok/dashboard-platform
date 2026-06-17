# Widget Editor Rendering Repair Design

## Goal

Make the existing widget editor code real. Widget cards render their configured
content, clicking a widget opens the edit panel, edits persist through the
widget API, data-source fetch uses the real dashboard ID, and the frontend and
backend agree on the widget JSON shape.

## Current Bugs

- `WidgetRenderer` exists but is not used by `DashboardEditor`.
- `WidgetEditPanel` exists but is not opened by any interaction.
- `updateWidget` and `reorderWidgets` exist in `widgetApi.ts` but no frontend
  code calls them.
- `WidgetDataSourceForm` calls `fetchWidgetData("PLACEHOLDER", widget.id)`.
- `.edit-panel-backdrop`, `.edit-panel`, and `.visual-0` are missing from CSS.
- Backend widget responses expose `displayConfigJson` and `dataSourceJson` as
  strings while frontend widgets expect parsed `displayConfig` and `dataSource`
  objects.

## Design

The repair keeps the existing embedded-widget backend model and changes only
the HTTP/frontend boundary. `WidgetResponse` will parse stored JSON strings into
`displayConfig` and `dataSource` objects. Widget mutation requests may continue
to send `displayConfigJson` and `dataSourceJson` strings for this slice, because
that is the existing service boundary. The frontend API will normalize either
response shape so old tests, temporary data, and future parsed responses do not
break the editor.

`DashboardEditor` becomes the owner of widget selection and edit persistence. A
widget card click selects the widget. The card still stops event propagation for
delete. The card body renders `WidgetRenderer` below the title instead of the
dead `{type} - {w}x{h}` placeholder.

`WidgetEditPanel` receives `dashboardId`, displays the existing fields, and
submits the full `WidgetInput` through `updateWidget`. It keeps current
`displayConfig` and `dataSource` values when unchanged so editing title or
layout does not erase configuration. The panel closes only after a successful
update. Validation errors remain visible in the panel, and stale version
conflicts use the editor's existing conflict notice.

`WidgetDataSourceForm` receives `dashboardId` and uses it for Test Fetch. Its
local URL, method, headers, and body controls remain local editor controls for
now. Persisting data-source edits can be added later by lifting those values
into the panel submission model; this repair only removes the placeholder ID
bug and prevents configured data from being erased by ordinary widget edits.

`reorderWidgets` gets a minimal visible use through Move Up and Move Down
buttons in the editor. Reordering sends the ordered widget IDs to the existing
API and replaces local widget state with the returned order.

CSS adds the missing edit-panel classes and the `visual-0` card color.

## Testing

Frontend tests cover:

- `widgetApi` normalizes parsed and string JSON widget response fields.
- `DashboardEditor` renders widgets with `WidgetRenderer`.
- Clicking a widget opens `WidgetEditPanel`.
- Saving a widget calls `PATCH /api/dashboards/{id}/widgets/{widgetId}` with
  the current dashboard version.
- Test Fetch calls `/api/dashboards/{realDashboardId}/widgets/{widgetId}/fetch`.
- Move controls call the reorder endpoint.

Backend tests cover:

- `WidgetResponse` serializes `displayConfig` and `dataSource` as JSON objects,
  not raw JSON strings.

## Acceptance Criteria

1. No widget renderer or edit panel dead code remains.
2. Existing widget edits can be saved from the dashboard editor.
3. Widget fetch uses the route dashboard ID.
4. Widget reorder has at least one real frontend caller.
5. CSS references used by touched components exist.
6. API responses match frontend widget types.
7. Targeted frontend and backend tests pass.
