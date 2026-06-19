# Dashboard Library Vertical Slice Design

## Goal

Replace the dependency-free visual prototype with the first production-ready
Dashboard Platform vertical slice: a React dashboard library backed by a
Spring Boot API and SQLite persistence, packaged as one Maven-built JAR.

## Scope

This slice supports:

- Listing dashboards
- Creating an empty dashboard
- Renaming a dashboard
- Duplicating a dashboard
- Deleting a dashboard after confirmation
- Searching the loaded dashboard library by name or description
- Detecting stale writes with optimistic version checks
- Displaying loading, validation, conflict, and unexpected error states

Dashboard IDs are immutable generated identifiers. A newly created dashboard
has an empty widget collection. Duplicating a dashboard copies its name,
description, and widget configuration while generating a new dashboard ID and
resetting its version.

This slice also covers widget management within an open dashboard:

- Adding a widget to a dashboard
- Removing a widget from a dashboard
- Reordering widgets on a dashboard
- Editing a widget's title, type, display configuration, and data source
- Fetching live data from a configured REST data source

Widget IDs are immutable generated identifiers scoped to their dashboard.
Widget state is persisted as a JSON array inside the dashboard row and is
protected by the same optimistic version check as dashboard mutations.

Dashboard variables, source credentials, WinSW service packaging, and
non-REST data source adapters are deferred.

## Repository Layout

The repository is a single Maven project:

```text
pom.xml
src/
  main/
    java/
      com/dashboardplatform/...
    frontend/
      package.json
      src/...
    resources/
      application.yml
  test/
    java/
      com/dashboardplatform/...
```

The existing prototype is migrated into React components under
`src/main/frontend/`. It is not retained as a separate application.

## Widget Domain Model

Each widget is a typed configuration object embedded in its dashboard's
`widgets_json` column. The schema for a single widget is:

```json
{
  "id": "<uuid>",
  "type": "table | chart | metric | text",
  "title": "<display name>",
  "position": { "x": 0, "y": 0, "w": 6, "h": 4 },
  "displayConfig": {},
  "dataSource": {
    "type": "rest",
    "url": "https://...",
    "method": "GET",
    "headers": { "Authorization": "Bearer ..." },
    "body": null
  }
}
```

`position` uses a grid coordinate system (`x`, `y`) with `w` and `h` in grid
units. `displayConfig` is widget-type-specific and is not validated beyond
being valid JSON. `dataSource` is optional; a widget without one renders a
static placeholder.

Widget types and their display semantics:

| Type | Description |
|------|-------------|
| `table` | Renders rows and columns from a JSON array response |
| `chart` | Renders a line or bar chart from a numeric series response |
| `metric` | Renders a single scalar value with label |
| `text` | Renders static markdown content from `displayConfig.content` |

## Build And Packaging

Maven is the authoritative production build. During `mvn package`, the build:

1. Installs frontend dependencies with npm.
2. Runs the frontend production build.
3. Copies `src/main/frontend/dist` into the Spring Boot static resource output.
4. Compiles and tests the Java application.
5. Produces one executable Spring Boot JAR.

The packaged server serves the React application and `/api` routes from the
same origin. Vite provides the development frontend server and proxies `/api`
requests to the Spring Boot development server.

## Backend Architecture

### HTTP Layer

`DashboardController` owns `/api/dashboards` request and response mapping:

- `GET /api/dashboards`
- `POST /api/dashboards`
- `PATCH /api/dashboards/{id}`
- `POST /api/dashboards/{id}/duplicate`
- `DELETE /api/dashboards/{id}?version={version}`

`WidgetController` owns `/api/dashboards/{dashboardId}/widgets`:

- `GET /api/dashboards/{dashboardId}/widgets` — list widgets for the dashboard
- `POST /api/dashboards/{dashboardId}/widgets?dashboardVersion={v}` — add a widget
- `PATCH /api/dashboards/{dashboardId}/widgets/{widgetId}?dashboardVersion={v}` — update a widget
- `PUT /api/dashboards/{dashboardId}/widgets/order?dashboardVersion={v}` — replace widget order
- `DELETE /api/dashboards/{dashboardId}/widgets/{widgetId}?dashboardVersion={v}` — remove a widget
- `POST /api/dashboards/{dashboardId}/widgets/{widgetId}/fetch` — execute the widget's configured REST data source and return raw JSON

All widget mutation requests pass `dashboardVersion` to guard against concurrent
dashboard edits. A successful mutation returns the updated dashboard version.
The data-source fetch endpoint does not mutate state; it proxies the configured
REST call on behalf of the browser and returns the raw response body.

Mutation requests include the version they were based on. Missing dashboards or
widgets return `404`. Invalid input returns `400`. Stale versions return `409`.

All API errors use:

```json
{
  "code": "dashboard_version_conflict",
  "message": "The dashboard changed after it was loaded.",
  "fieldErrors": {}
}
```

`fieldErrors` is present and empty when an error is not tied to a form field.

### Service Layer

`DashboardService` owns application rules:

- Generate immutable UUID dashboard IDs.
- Trim and validate names and descriptions.
- Require a non-empty dashboard name.
- Create dashboards with version `1`.
- Increment the version after each successful rename.
- Duplicate dashboards with a new ID, version `1`, and a `"Copy"` name suffix.
- Reject stale rename and delete operations.
- Preserve the stored dashboard when a stale operation is rejected.

`WidgetService` owns widget rules:

- Generate immutable UUID widget IDs on add.
- Validate widget title (required, max 120 characters), type (enum), and position fields.
- Validate `dataSource.url` as a non-empty HTTPS URL when a data source is provided.
- Validate `dataSource.method` as `GET` or `POST`.
- Reject requests referencing a widget ID that does not exist in the dashboard.
- Increment the dashboard version after every successful widget mutation.
- Reject widget mutations with a stale dashboard version.
- For the data-source fetch, load the stored widget config, perform the outbound
  HTTP call with the configured URL, method, and headers, and return the raw
  response body without caching.
- Outbound fetch errors (non-2xx, timeout, DNS failure) are returned as a
  structured error rather than propagated as 500.

### Persistence Layer

`DashboardRepository` defines the persistence boundary. The SQLite
implementation uses Spring JDBC and transactions rather than an ORM.

The initial schema stores:

- `id` as text UUID primary key
- `name` as required text
- `description` as required text with an empty-string default
- `widgets_json` as required JSON text with a `[]` default
- `version` as required integer
- `created_at` and `updated_at` as required UTC timestamps

Schema initialization uses versioned SQL migrations. The SQLite database path
comes from configuration and defaults to a local development file outside the
packaged JAR.

Optimistic updates and deletes use a single SQL statement constrained by both
`id` and `version`. Updating zero rows triggers a follow-up existence check to
distinguish `404` from `409`.

## Frontend Architecture

The frontend uses React, TypeScript, and Vite. It keeps server state in a
small dashboard API module and component state; no additional state-management
library is introduced.

Primary units — Dashboard Library:

- `dashboardApi.ts`: typed HTTP operations and API error decoding
- `DashboardLibrary.tsx`: loading, searching, and dashboard-card rendering
- `CreateDashboardDialog.tsx`: create form and validation display
- `RenameDashboardDialog.tsx`: rename form using the loaded version
- `DeleteDashboardDialog.tsx`: destructive confirmation using the loaded version
- `DashboardCard.tsx`: open, rename, duplicate, and delete actions

Primary units — Dashboard Editor (opened when a card is clicked):

- `widgetApi.ts`: typed HTTP operations for widget CRUD and data-source fetch
- `DashboardEditor.tsx`: canvas rendering widgets in grid positions, add/select/delete controls
- `WidgetAddDialog.tsx`: type picker and initial title/position form
- `WidgetEditPanel.tsx`: slide-in panel for editing title, type, display config, and data source
- `WidgetDataSourceForm.tsx`: URL, method, and headers fields with a live-fetch test button
- `WidgetRenderer.tsx`: dispatches to `TableWidget`, `ChartWidget`, `MetricWidget`, or `TextWidget`
- `WidgetFetchResult.tsx`: displays raw response or structured fetch error

After a successful mutation, the frontend replaces its local dashboard list
with the returned dashboard data or removes the deleted record. It does not
silently retry stale mutations.

On a `409`, the current dialog stays open, the user-entered value remains
available, and the UI explains that the library must be reloaded before the
operation can be retried. Unexpected failures retain the current screen and
show a dismissible error notice.

Search remains client-side because the first slice loads the full dashboard
library. It matches dashboard name and description case-insensitively.

The Dashboard Editor route is `/dashboards/{id}`. Navigating back to `/`
returns to the library. The editor fetches the full dashboard on mount
(including its `widgetsJson`) and keeps local widget state synchronized with
successful mutation responses.

## Data Flow

On application start:

1. React requests `GET /api/dashboards`.
2. Spring MVC delegates to `DashboardService`.
3. The service reads through `DashboardRepository`.
4. SQLite records are mapped into API dashboard summaries.
5. React renders the dashboard library.

For mutations:

1. A dialog submits validated input and the loaded dashboard version.
2. The controller validates the HTTP shape.
3. The service applies domain rules.
4. The repository performs the transactional write.
5. The API returns the resulting dashboard or `204` for deletion.
6. React updates local state or displays the decoded error.

## Validation And Errors

- Dashboard names are trimmed and must contain between 1 and 120 characters.
- Descriptions are trimmed and may contain at most 500 characters.
- Widget titles are trimmed and must contain between 1 and 120 characters.
- Widget type must be one of `table`, `chart`, `metric`, or `text`.
- Widget position fields (`x`, `y`, `w`, `h`) must be non-negative integers; `w` and `h` must be at least 1.
- Data source URL, when provided, must be a valid HTTPS URL.
- Data source method must be `GET` or `POST`.
- The frontend performs the same checks for immediate feedback.
- The backend remains authoritative and returns field-specific validation.
- Outbound data-source fetch errors return a structured `fetch_error` response
  carrying the HTTP status or a network error message; they do not return 500.
- SQLite failures and uncaught server errors return a generic
  `internal_error` response without database or stack-trace details.
- React distinguishes network failures from structured API failures.

## Testing Ownership And Strategy

A dedicated GPT-5.4 subagent owns automated test creation and maintenance. The
production implementation is developed against those independently authored
tests. The coordinating agent reviews test patches and runs the final suites
but does not author the tests.

Backend coverage includes:

- SQLite persistence across repository instances
- Dashboard creation defaults and generated IDs
- Rename version increments
- Duplication rules
- Delete behavior
- Missing-dashboard responses
- Stale rename and delete rejection without data loss
- Widget add, update, reorder, and delete mutating the embedded JSON
- Widget operations incrementing dashboard version
- Stale widget mutations rejected without data loss
- Unknown widget ID returns 404
- Data-source fetch proxying a configured REST endpoint
- Data-source fetch error handling (non-2xx, timeout)
- Validation and consistent API error responses
- Static frontend fallback behavior

Frontend coverage includes:

- Initial loading and dashboard rendering
- Case-insensitive search
- Create, rename, duplicate, and delete flows
- Confirmation before deletion
- Field validation messages
- Conflict errors preserving dialog input
- Network and unexpected error notices
- Widget rendering in the dashboard editor
- Add, edit, reorder, and remove widget flows
- Widget validation messages (title, type, position, data source URL)
- Live data-source fetch triggering and response display
- Data-source fetch error display

Final verification runs the complete frontend test suite, Maven test suite,
frontend production build, Maven package, and an HTTP smoke test against the
packaged application.

## Operational Constraints

- Java 21 is the runtime baseline.
- Node.js is required for development and builds, not deployment.
- The application is intended for a trusted private network.
- Authentication and authorization are outside this slice.
- The SQLite database is stored outside the application JAR.
- Production delivers one executable JAR; WinSW configuration comes later.

## Acceptance Criteria

The slice is complete when:

1. A fresh SQLite database initializes automatically.
2. Dashboard library CRUD survives an application restart.
3. Stale rename and delete requests return `409` without overwriting data.
4. The React library supports all scoped dashboard actions and preserves form
   state on conflicts.
5. Widgets can be added, edited, reordered, and removed from an open dashboard
   and the changes survive an application restart.
6. Stale widget mutation requests return `409` without overwriting widget data.
7. The data-source fetch executes a configured REST call and displays the raw
   response or a structured error in the editor.
8. `mvn package` builds and tests both frontend and backend and emits one
   executable JAR containing the frontend.
9. The packaged application serves the React entry point and dashboard API.
10. All GPT-5.4-authored automated tests and the packaged-app smoke test pass.
