# Dashboard Library Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Low-token execution prompt:** Implement only one task step at a time from this plan. Read only that step plus the minimum directly related files. Do not scan the whole repository or summarize unrelated sections. Before editing, list the files you will touch in 3 bullets max. Then implement the change, run only the smallest relevant verification, and finish with: files changed, what was implemented, verification result, and any blocker or follow-up.

**Goal:** Ship a single executable Spring Boot JAR containing a React dashboard library with SQLite-backed create, list, rename, duplicate, and delete operations.

**Architecture:** The repository becomes one Maven project. Spring Boot exposes a layered dashboard API backed by Spring JDBC and SQLite; React, TypeScript, and Vite live under `src/main/frontend` and are built into the JAR. Automated tests are authored and maintained by a dedicated GPT-5.4 subagent, while production implementation remains separate.

**Tech Stack:** Java 21, Maven Wrapper, Spring Boot, Spring MVC, Spring JDBC, SQLite JDBC, React, TypeScript, Vite, Vitest, Testing Library

---

## GPT-5.4 Mini Execution Guide

Use this prompt frame for every implementation turn:

```text
Implement only the slice below from D:/AI/dashboard-platform/docs/superpowers/plans/2026-06-15-dashboard-library-vertical-slice.md.

Read only the listed files.
Do not scan the whole repository.
Before editing, list the files you will touch in 3 bullets max.
Then implement the change, run the smallest relevant verification, and finish with:
1. files changed
2. what was implemented
3. verification result
4. blocker or follow-up
```

Recommended scope: one step per turn, usually 1-3 files, and avoid combining backend, tests, and frontend in the same request.

### Model Usage Policy

- Use `GPT-5.4 mini` by default for mechanical implementation slices that touch 1-3 files and have clear acceptance criteria from this plan.
- Use `GPT-5.4 mini` for focused test authoring, small config edits, DTO changes, repository methods, and isolated React component updates.
- Escalate to `GPT-5.4` when the task spans multiple layers, requires judgment across many files, involves debugging unclear failures, or the mini worker reports `BLOCKED` or repeats the same mistake.
- Use `GPT-5.4` for spec-compliance review, code-quality review, and manager decisions about whether a deviation is acceptable.
- Do not use `GPT-5.4` for routine single-step implementation if `GPT-5.4 mini` can execute it safely from the written plan.
- If a task mixes implementation, debugging, and review, split it first so `GPT-5.4 mini` handles the implementation slice and `GPT-5.4` handles the review slice.
- Prefer one worker turn plus one review turn over a single broad turn with a larger model.
- If verification is blocked by environment issues such as `JAVA_HOME`, network access, or wrapper downloads, resolve the environment blocker before escalating model size.

### Suggested Mini Slices

- **Task 1 Step 1**
  Only inspect: `mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties`
- **Task 1 Step 2**
  Only inspect: `pom.xml`
- **Task 1 Step 3**
  Only inspect: `src/main/java/com/dashboardplatform/DashboardPlatformApplication.java`
- **Task 1 Step 4**
  Only inspect: `src/main/resources/application.yml`
- **Task 1 Step 5a**
  Only inspect: `src/main/frontend/package.json`, `src/main/frontend/package-lock.json`, `src/main/frontend/tsconfig.json`, `src/main/frontend/vite.config.ts`
- **Task 1 Step 5b**
  Only inspect: `src/main/frontend/index.html`, `src/main/frontend/src/main.tsx`, `src/main/frontend/src/App.tsx`
- **Task 2 Step 2**
  Only inspect: `src/test/java/com/dashboardplatform/dashboard/JdbcDashboardRepositoryTest.java`, `src/main/resources/db/migration/V1__create_dashboards.sql`, `src/main/java/com/dashboardplatform/dashboard/DatabaseMigrationRunner.java`, `src/main/java/com/dashboardplatform/dashboard/DashboardRepository.java`
- **Task 2 Step 3**
  Only inspect: `src/test/java/com/dashboardplatform/dashboard/DashboardServiceTest.java`, `src/main/java/com/dashboardplatform/dashboard/DashboardService.java`, `src/main/java/com/dashboardplatform/dashboard/DashboardExceptions.java`, `src/main/java/com/dashboardplatform/dashboard/Dashboard.java`
- **Task 3 Step 1**
  Only inspect: `src/main/resources/db/migration/V1__create_dashboards.sql`, `src/main/java/com/dashboardplatform/dashboard/DatabaseMigrationRunner.java`
- **Task 3 Step 2**
  Only inspect: `src/main/java/com/dashboardplatform/dashboard/Dashboard.java`, `src/main/java/com/dashboardplatform/dashboard/DashboardRepository.java`
- **Task 3 Step 3**
  Only inspect: `src/main/java/com/dashboardplatform/dashboard/JdbcDashboardRepository.java`, `src/main/java/com/dashboardplatform/dashboard/Dashboard.java`, `src/main/java/com/dashboardplatform/dashboard/DashboardRepository.java`
- **Task 3 Step 4**
  Only inspect: `src/main/java/com/dashboardplatform/dashboard/DashboardExceptions.java`
- **Task 3 Step 5**
  Only inspect: `src/main/java/com/dashboardplatform/dashboard/DashboardService.java`, `src/main/java/com/dashboardplatform/dashboard/DashboardRepository.java`, `src/main/java/com/dashboardplatform/dashboard/Dashboard.java`, `src/main/java/com/dashboardplatform/dashboard/DashboardExceptions.java`
- **Task 4 Step 1**
  Only inspect: `src/test/java/com/dashboardplatform/dashboard/DashboardControllerTest.java`, `src/main/java/com/dashboardplatform/dashboard/DashboardController.java`, `src/main/java/com/dashboardplatform/web/ApiExceptionHandler.java`
- **Task 4 Step 2**
  Only inspect: `src/test/java/com/dashboardplatform/web/SpaForwardControllerTest.java`, `src/main/java/com/dashboardplatform/web/SpaForwardController.java`
- **Task 5 Step 1**
  Only inspect: `src/main/java/com/dashboardplatform/dashboard/DashboardRequests.java`, `src/main/java/com/dashboardplatform/dashboard/DashboardResponse.java`
- **Task 5 Step 2**
  Only inspect: `src/main/java/com/dashboardplatform/dashboard/DashboardController.java`, `src/main/java/com/dashboardplatform/dashboard/DashboardRequests.java`, `src/main/java/com/dashboardplatform/dashboard/DashboardResponse.java`, `src/main/java/com/dashboardplatform/dashboard/DashboardService.java`
- **Task 5 Step 3**
  Only inspect: `src/main/java/com/dashboardplatform/web/ApiError.java`, `src/main/java/com/dashboardplatform/web/ApiExceptionHandler.java`, `src/main/java/com/dashboardplatform/dashboard/DashboardExceptions.java`
- **Task 5 Step 4**
  Only inspect: `src/main/java/com/dashboardplatform/web/SpaForwardController.java`
- **Task 6 Step 1**
  Only inspect: `src/main/frontend/src/dashboard/__tests__/dashboardApi.test.ts`, `src/main/frontend/src/dashboard/dashboardApi.ts`, `src/main/frontend/src/dashboard/types.ts`
- **Task 6 Step 2**
  Only inspect: `src/main/frontend/src/dashboard/__tests__/DashboardLibrary.test.tsx`, `src/main/frontend/src/test/setup.ts`, `src/main/frontend/src/dashboard/DashboardLibrary.tsx`
- **Task 7 Types**
  Only inspect: `src/main/frontend/src/dashboard/types.ts`
- **Task 7 Step 1**
  Only inspect: `src/main/frontend/src/dashboard/dashboardApi.ts`, `src/main/frontend/src/dashboard/types.ts`
- **Task 7 Step 2**
  Only inspect: `src/main/frontend/src/dashboard/DashboardLibrary.tsx`, `src/main/frontend/src/dashboard/types.ts`, `src/main/frontend/src/dashboard/dashboardApi.ts`
- **Task 7 Step 3a**
  Only inspect: `src/main/frontend/src/dashboard/DashboardDialog.tsx`
- **Task 7 Step 3b**
  Only inspect: `src/main/frontend/src/dashboard/CreateDashboardDialog.tsx`, `src/main/frontend/src/dashboard/DashboardDialog.tsx`
- **Task 7 Step 3c**
  Only inspect: `src/main/frontend/src/dashboard/RenameDashboardDialog.tsx`, `src/main/frontend/src/dashboard/DashboardDialog.tsx`
- **Task 7 Step 3d**
  Only inspect: `src/main/frontend/src/dashboard/DeleteDashboardDialog.tsx`, `src/main/frontend/src/dashboard/DashboardDialog.tsx`
- **Task 7 Card Presentation**
  Only inspect: `src/main/frontend/src/dashboard/DashboardCard.tsx`, `src/main/frontend/src/dashboard/icons.tsx`
- **Task 7 App Wiring**
  Only inspect: `src/main/frontend/src/App.tsx`, `src/main/frontend/src/dashboard/DashboardLibrary.tsx`
- **Task 7 Step 4**
  Only inspect: `src/main/frontend/src/styles.css`, `README.md`
- **Task 8 Step 1**
  Only inspect: `README.md`
- **Task 8 Plan Updates**
  Only inspect: `docs/superpowers/plans/2026-06-15-dashboard-library-vertical-slice.md`

## File Structure

```text
pom.xml                                      Maven build and frontend packaging
mvnw
mvnw.cmd
.mvn/wrapper/maven-wrapper.properties        Reproducible Maven runtime
src/main/java/com/dashboardplatform/
  DashboardPlatformApplication.java          Spring Boot entry point
  dashboard/
    Dashboard.java                           Domain record
    DashboardRepository.java                 Persistence interface
    DashboardService.java                    Dashboard rules
    DashboardController.java                 REST routes
    JdbcDashboardRepository.java             SQLite persistence
    DatabaseMigrationRunner.java             Versioned SQLite migrations
    DashboardRequests.java                   Request records
    DashboardResponse.java                   API response record
    DashboardExceptions.java                 Typed application exceptions
  web/
    ApiError.java                            Stable API error shape
    ApiExceptionHandler.java                 Exception-to-response mapping
    SpaForwardController.java                Client-route fallback
src/main/resources/
  application.yml                            SQLite configuration
  db/migration/V1__create_dashboards.sql      Initial schema
src/main/frontend/
  package.json
  package-lock.json
  index.html
  tsconfig.json
  vite.config.ts
  src/
    main.tsx
    App.tsx
    styles.css
    dashboard/
      types.ts
      dashboardApi.ts
      DashboardLibrary.tsx
      DashboardCard.tsx
      CreateDashboardDialog.tsx
      RenameDashboardDialog.tsx
      DeleteDashboardDialog.tsx
      DashboardDialog.tsx
      icons.tsx
src/test/java/com/dashboardplatform/
  dashboard/
    JdbcDashboardRepositoryTest.java
    DashboardServiceTest.java
    DashboardControllerTest.java
  web/
    SpaForwardControllerTest.java
src/main/frontend/src/dashboard/__tests__/
  dashboardApi.test.ts
  DashboardLibrary.test.tsx
```

## Task 1: Establish The Maven And Frontend Build

**Files:**
- Create: `pom.xml`
- Create: `mvnw`
- Create: `mvnw.cmd`
- Create: `.mvn/wrapper/maven-wrapper.properties`
- Create: `src/main/java/com/dashboardplatform/DashboardPlatformApplication.java`
- Create: `src/main/resources/application.yml`
- Create: `src/main/frontend/package.json`
- Create: `src/main/frontend/package-lock.json`
- Create: `src/main/frontend/index.html`
- Create: `src/main/frontend/tsconfig.json`
- Create: `src/main/frontend/vite.config.ts`
- Create: `src/main/frontend/src/main.tsx`
- Create: `src/main/frontend/src/App.tsx`

- [ ] **Step 1: Add the Maven Wrapper**

Use the official Maven Wrapper scripts and configure Maven 3.9.x in
`.mvn/wrapper/maven-wrapper.properties`. Verify:

```powershell
.\mvnw.cmd -version
```

Expected: Maven starts through the wrapper and reports Java 21.

- [ ] **Step 2: Define the backend dependencies**

Create `pom.xml` with:

- Java release 21
- Spring Boot parent
- `spring-boot-starter-web`
- `spring-boot-starter-jdbc`
- `org.xerial:sqlite-jdbc`
- `spring-boot-starter-test`
- `frontend-maven-plugin`
- `maven-resources-plugin`
- `spring-boot-maven-plugin`

Bind npm install, frontend tests, and frontend build before `process-resources`.
Copy `src/main/frontend/dist` into
`${project.build.outputDirectory}/static`.

- [ ] **Step 3: Create the minimal Spring Boot entry point**

```java
package com.dashboardplatform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DashboardPlatformApplication {
    public static void main(String[] args) {
        SpringApplication.run(DashboardPlatformApplication.class, args);
    }
}
```

- [ ] **Step 4: Configure SQLite**

Use `DASHBOARD_DB_PATH` when present and default to
`./data/dashboard-platform.db`:

```yaml
spring:
  datasource:
    url: jdbc:sqlite:${DASHBOARD_DB_PATH:./data/dashboard-platform.db}
    driver-class-name: org.sqlite.JDBC
  flyway:
    enabled: true
server:
  error:
    include-message: never
```

- [ ] **Step 5: Create the React/Vite shell**

Configure:

- React TypeScript entry point
- Vite `/api` proxy to `http://localhost:8080`
- Vitest with jsdom and Testing Library setup
- Scripts: `dev`, `build`, `test`, and `test:run`

The initial `App` renders `Dashboard Library` so build wiring can be checked
without implementing behavior.

- [ ] **Step 6: Verify the foundation**

Run:

```powershell
Set-Location src/main/frontend
npm.cmd ci
npm.cmd run build
Set-Location ../../..
.\mvnw.cmd -DskipTests package
```

Expected: both builds exit `0` and an executable JAR appears under `target/`.

- [ ] **Step 7: Commit**

```powershell
git add pom.xml mvnw mvnw.cmd .mvn src/main
git commit -m "build: establish spring and react application"
```

## Task 2: Have GPT-5.4 Author Failing Persistence And Service Tests

**Files:**
- Create: `src/test/java/com/dashboardplatform/dashboard/JdbcDashboardRepositoryTest.java`
- Create: `src/test/java/com/dashboardplatform/dashboard/DashboardServiceTest.java`

- [ ] **Step 1: Dispatch the test subagent**

Spawn a GPT-5.4 worker with exclusive ownership of `src/test/**` and
`src/main/frontend/src/**/__tests__/**`. Tell it not to edit production files
and not to revert other work.

- [ ] **Step 2: Write repository contract tests**

The tests must require:

- Insert and retrieve a dashboard with `widgetsJson` preserved
- List dashboards ordered by most recently updated
- Persistence across two repository instances pointing at the same SQLite file
- Update only when both ID and version match
- Delete only when both ID and version match
- Existence check distinguishes missing records from stale versions

Use a temporary SQLite file per test and run the application migration runner
before constructing the repository.

- [ ] **Step 3: Write service rule tests**

The tests must require:

- Create trims input, generates a UUID, starts at version `1`, and stores `[]`
- Empty or overlong names are rejected with a `name` field error
- Overlong descriptions are rejected with a `description` field error
- Rename trims values and increments the version
- Duplicate creates a new ID, appends `Copy`, preserves description/widgets,
  and resets version to `1`
- Stale rename and delete throw a conflict exception without changing storage
- Missing source dashboards throw a not-found exception

- [ ] **Step 4: Run and record the expected RED result**

```powershell
.\mvnw.cmd -Dtest=JdbcDashboardRepositoryTest,DashboardServiceTest test
```

Expected: compilation or assertion failures because the dashboard production
types do not exist yet. The subagent reports the exact failures.

## Task 3: Implement The Dashboard Domain And SQLite Repository

**Files:**
- Create: `src/main/resources/db/migration/V1__create_dashboards.sql`
- Create: `src/main/java/com/dashboardplatform/dashboard/Dashboard.java`
- Create: `src/main/java/com/dashboardplatform/dashboard/DashboardRepository.java`
- Create: `src/main/java/com/dashboardplatform/dashboard/JdbcDashboardRepository.java`
- Create: `src/main/java/com/dashboardplatform/dashboard/DatabaseMigrationRunner.java`
- Create: `src/main/java/com/dashboardplatform/dashboard/DashboardExceptions.java`
- Create: `src/main/java/com/dashboardplatform/dashboard/DashboardService.java`

- [ ] **Step 1: Create the schema**

```sql
CREATE TABLE dashboards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    widgets_json TEXT NOT NULL DEFAULT '[]',
    version INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX dashboards_updated_at_idx
    ON dashboards(updated_at DESC);
```

Implement `DatabaseMigrationRunner` to create a `schema_history` table, inspect
applied versions, run `V1__create_dashboards.sql` once, and record version `1`
in the same transaction. This keeps migrations versioned without relying on a
database tool that does not clearly support SQLite.

- [ ] **Step 2: Define the domain record and repository interface**

`Dashboard` contains:

```java
UUID id;
String name;
String description;
String widgetsJson;
long version;
Instant createdAt;
Instant updatedAt;
```

`DashboardRepository` exposes:

```java
List<Dashboard> findAll();
Optional<Dashboard> findById(UUID id);
boolean existsById(UUID id);
void insert(Dashboard dashboard);
boolean update(Dashboard dashboard, long expectedVersion);
boolean delete(UUID id, long expectedVersion);
```

- [ ] **Step 3: Implement JDBC persistence**

Use `JdbcTemplate`, explicit row mapping, ISO-8601 UTC timestamps, and
parameterized SQL. `update` and `delete` return whether exactly one row changed.

- [ ] **Step 4: Implement typed exceptions**

Define:

- `DashboardNotFoundException`
- `DashboardVersionConflictException`
- `DashboardValidationException` carrying `Map<String, String> fieldErrors`

- [ ] **Step 5: Implement service rules**

Inject `DashboardRepository`, `Clock`, and a UUID supplier. Keep validation in
small private methods. On zero-row update/delete, check existence and throw
not-found or conflict accordingly.

- [ ] **Step 6: Verify GREEN**

```powershell
.\mvnw.cmd -Dtest=JdbcDashboardRepositoryTest,DashboardServiceTest test
```

Expected: all repository and service tests pass.

- [ ] **Step 7: Commit**

```powershell
git add src/main/java/com/dashboardplatform/dashboard src/main/resources/db src/test/java/com/dashboardplatform/dashboard
git commit -m "feat: persist dashboard library in sqlite"
```

## Task 4: Have GPT-5.4 Author Failing API And SPA Tests

**Files:**
- Create: `src/test/java/com/dashboardplatform/dashboard/DashboardControllerTest.java`
- Create: `src/test/java/com/dashboardplatform/web/SpaForwardControllerTest.java`

- [ ] **Step 1: Write controller tests**

Using `MockMvc`, require:

- `GET /api/dashboards` returns dashboard summaries
- `POST /api/dashboards` returns `201` and a `Location` header
- `PATCH /api/dashboards/{id}` returns the incremented version
- `POST /api/dashboards/{id}/duplicate` returns `201`
- `DELETE /api/dashboards/{id}?version=...` returns `204`
- Validation errors return `400` with stable `code`, `message`, and
  `fieldErrors`
- Missing dashboards return `404`
- Stale mutations return `409` with `dashboard_version_conflict`
- Unexpected errors return sanitized `500` responses

- [ ] **Step 2: Write SPA fallback tests**

Require non-file, non-API browser routes to forward to `/index.html`, while
`/api/**` and requests containing a filename extension are not forwarded.

- [ ] **Step 3: Run and record RED**

```powershell
.\mvnw.cmd -Dtest=DashboardControllerTest,SpaForwardControllerTest test
```

Expected: failures because the controller, error handler, and SPA fallback do
not exist.

## Task 5: Implement The REST API And Error Contract

**Files:**
- Create: `src/main/java/com/dashboardplatform/dashboard/DashboardRequests.java`
- Create: `src/main/java/com/dashboardplatform/dashboard/DashboardResponse.java`
- Create: `src/main/java/com/dashboardplatform/dashboard/DashboardController.java`
- Create: `src/main/java/com/dashboardplatform/web/ApiError.java`
- Create: `src/main/java/com/dashboardplatform/web/ApiExceptionHandler.java`
- Create: `src/main/java/com/dashboardplatform/web/SpaForwardController.java`

- [ ] **Step 1: Define request and response records**

Use Jakarta validation:

```java
record CreateDashboardRequest(
    @NotBlank @Size(max = 120) String name,
    @Size(max = 500) String description) {}

record RenameDashboardRequest(
    @NotBlank @Size(max = 120) String name,
    @Size(max = 500) String description,
    @Positive long version) {}
```

`DashboardResponse` includes ID, name, description, parsed widgets, version,
created timestamp, and updated timestamp.

- [ ] **Step 2: Implement controller routes**

Map the five routes from the design. Return `Location` for create and
duplicate. Return `204` for delete.

- [ ] **Step 3: Implement consistent errors**

`ApiError` contains:

```java
String code;
String message;
Map<String, String> fieldErrors;
```

Map validation, not-found, conflict, and unexpected exceptions. Log unexpected
exceptions server-side without exposing details in the response.

- [ ] **Step 4: Implement SPA fallback**

Forward client routes without a file extension to `/index.html`, excluding all
paths under `/api`.

- [ ] **Step 5: Verify GREEN**

```powershell
.\mvnw.cmd -Dtest=DashboardControllerTest,SpaForwardControllerTest test
```

Expected: all controller and fallback tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/main/java/com/dashboardplatform src/test/java/com/dashboardplatform
git commit -m "feat: expose dashboard library api"
```

## Task 6: Have GPT-5.4 Author Failing Frontend Tests

**Files:**
- Create: `src/main/frontend/src/dashboard/__tests__/dashboardApi.test.ts`
- Create: `src/main/frontend/src/dashboard/__tests__/DashboardLibrary.test.tsx`
- Create: `src/main/frontend/src/test/setup.ts`

- [ ] **Step 1: Write API client tests**

Require:

- Correct methods, paths, query values, and JSON bodies
- Successful JSON decoding
- `204` deletion handling
- Structured API error decoding
- Network failures represented separately from API failures

- [ ] **Step 2: Write dashboard library interaction tests**

Require:

- Loading and initial dashboard rendering
- Empty-library and no-search-results states
- Case-insensitive name and description search
- Create, rename, duplicate, and delete requests
- Explicit delete confirmation
- Immediate name/description validation
- Conflict errors leave the dialog open and preserve typed input
- Unexpected failures show a dismissible notice

Use Mock Service Worker or a small fetch stub at the HTTP boundary; do not mock
React components.

- [ ] **Step 3: Run and record RED**

```powershell
Set-Location src/main/frontend
npm.cmd run test:run
```

Expected: failures because the dashboard API and components do not exist.

## Task 7: Implement The React Dashboard Library

**Files:**
- Create: `src/main/frontend/src/dashboard/types.ts`
- Create: `src/main/frontend/src/dashboard/dashboardApi.ts`
- Create: `src/main/frontend/src/dashboard/DashboardLibrary.tsx`
- Create: `src/main/frontend/src/dashboard/DashboardCard.tsx`
- Create: `src/main/frontend/src/dashboard/DashboardDialog.tsx`
- Create: `src/main/frontend/src/dashboard/CreateDashboardDialog.tsx`
- Create: `src/main/frontend/src/dashboard/RenameDashboardDialog.tsx`
- Create: `src/main/frontend/src/dashboard/DeleteDashboardDialog.tsx`
- Create: `src/main/frontend/src/dashboard/icons.tsx`
- Modify: `src/main/frontend/src/App.tsx`
- Create: `src/main/frontend/src/styles.css`
- Delete: `index.html`
- Delete: `server.mjs`
- Delete: `src/app.mjs`
- Delete: `src/data.mjs`
- Delete: `src/model.mjs`
- Delete: `src/styles.css`
- Delete: `tests/model.test.mjs`
- Delete: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Implement typed API operations**

Expose:

```typescript
listDashboards(): Promise<Dashboard[]>
createDashboard(input: DashboardInput): Promise<Dashboard>
renameDashboard(id: string, input: DashboardInput & { version: number }): Promise<Dashboard>
duplicateDashboard(id: string): Promise<Dashboard>
deleteDashboard(id: string, version: number): Promise<void>
```

Throw discriminated `ApiFailure` and `NetworkFailure` values.

- [ ] **Step 2: Implement the dashboard library state**

Keep dashboards, search text, loading state, active dialog, and notice state in
`DashboardLibrary`. Update the local list from successful mutation responses.
Do not silently refetch or retry conflicts.

- [ ] **Step 3: Implement accessible dialogs**

Share dialog framing through `DashboardDialog`. Use labelled inputs, submit
buttons, cancel buttons, autofocus, Escape handling, and focus restoration.
Preserve input after failed submissions.

- [ ] **Step 4: Migrate the prototype visual system**

Move the existing navy, off-white, white, and cobalt system into React CSS.
Preserve the sidebar, page header, search toolbar, dashboard cards, responsive
breakpoints, focus-visible styles, and reduced-motion behavior. Remove visual
controls for deferred data sources and dashboard editing.

- [ ] **Step 5: Remove the old prototype runtime**

Delete the root Node server, dependency-free app, old model tests, and root
package manifest only after their React equivalents are working.

- [ ] **Step 6: Verify GREEN**

```powershell
Set-Location src/main/frontend
npm.cmd run test:run
npm.cmd run build
```

Expected: all frontend tests pass and Vite emits `dist/`.

- [ ] **Step 7: Commit**

```powershell
git add -A
git commit -m "feat: migrate dashboard library to react"
```

## Task 8: Complete Packaging, Documentation, And Independent Audit

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-06-15-dashboard-library-vertical-slice.md`

- [ ] **Step 1: Document development and production commands**

Document:

```powershell
.\mvnw.cmd spring-boot:run
Set-Location src/main/frontend
npm.cmd run dev
Set-Location ../../..
.\mvnw.cmd package
java -jar target/dashboard-platform-*.jar
```

Explain `DASHBOARD_DB_PATH` and that Node.js is build-time only in production.

- [ ] **Step 2: Ask GPT-5.4 to audit tests**

The test subagent reviews the implemented behavior against the approved spec,
adds missing tests only within its owned test paths, and runs frontend and
backend suites. It reports exact commands and pass/fail counts.

- [ ] **Step 3: Run the full verification suite**

```powershell
Set-Location src/main/frontend
npm.cmd run test:run
npm.cmd run build
Set-Location ../../..
.\mvnw.cmd test
.\mvnw.cmd package
```

Expected: every command exits `0`.

- [ ] **Step 4: Smoke-test the packaged application**

Start the generated JAR with a temporary SQLite path and verify:

```text
GET /                         -> 200 and React HTML
GET /api/dashboards           -> 200 and JSON array
POST /api/dashboards          -> 201
PATCH /api/dashboards/{id}    -> 200 with incremented version
DELETE /api/dashboards/{id}   -> 204
```

Restart the JAR with the same database and confirm the created dashboard
remains before deleting it.

- [ ] **Step 5: Check repository state**

```powershell
git status --short
git diff --check
```

Expected: only intentional untracked context/ADR files remain and no whitespace
errors are reported.

- [ ] **Step 6: Commit**

```powershell
git add README.md docs/superpowers/plans/2026-06-15-dashboard-library-vertical-slice.md
git commit -m "docs: document dashboard platform build"
```
