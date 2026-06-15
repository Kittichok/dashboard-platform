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

Widgets remain visual mock content in this slice. Widget editing, dashboard
variables, data sources, source credentials, REST proxy execution, and WinSW
service packaging are deferred.

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

Mutation requests include the version they were based on. Missing dashboards
return `404`. Invalid input returns `400`. Stale versions return `409`.

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

Primary units:

- `dashboardApi.ts`: typed HTTP operations and API error decoding
- `DashboardLibrary.tsx`: loading, searching, and dashboard-card rendering
- `CreateDashboardDialog.tsx`: create form and validation display
- `RenameDashboardDialog.tsx`: rename form using the loaded version
- `DeleteDashboardDialog.tsx`: destructive confirmation using the loaded version
- `DashboardCard.tsx`: open, rename, duplicate, and delete actions

After a successful mutation, the frontend replaces its local dashboard list
with the returned dashboard data or removes the deleted record. It does not
silently retry stale mutations.

On a `409`, the current dialog stays open, the user-entered value remains
available, and the UI explains that the library must be reloaded before the
operation can be retried. Unexpected failures retain the current screen and
show a dismissible error notice.

Search remains client-side because the first slice loads the full dashboard
library. It matches dashboard name and description case-insensitively.

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
- The frontend performs the same length checks for immediate feedback.
- The backend remains authoritative and returns field-specific validation.
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
4. The React library supports all scoped actions and preserves form state on
   conflicts.
5. `mvn package` builds and tests both frontend and backend and emits one
   executable JAR containing the frontend.
6. The packaged application serves the React entry point and dashboard API.
7. All GPT-5.4-authored automated tests and the packaged-app smoke test pass.
