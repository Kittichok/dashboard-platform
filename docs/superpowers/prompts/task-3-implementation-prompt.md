Implement only Task 3 from:
`D:/AI/dashboard-platform/docs/superpowers/plans/2026-06-15-dashboard-library-vertical-slice.md`

Project context:
- `D:/AI/dashboard-platform/CONTEXT.md`

Execution rules:
- Keep token usage low
- Use `GPT-5.4 mini` by default for implementation slices
- Work on only one Task 3 step at a time
- Read only the current step and the minimum directly related files
- Do not scan the whole repository
- Before editing, list the files you will touch in 3 bullets max
- Then implement the change
- Run only the smallest relevant verification
- Finish with:
  1. files changed
  2. what was implemented
  3. verification result
  4. blocker or follow-up

Task 3 scope:
- Create `src/main/resources/db/migration/V1__create_dashboards.sql`
- Create `src/main/java/com/dashboardplatform/dashboard/Dashboard.java`
- Create `src/main/java/com/dashboardplatform/dashboard/DashboardRepository.java`
- Create `src/main/java/com/dashboardplatform/dashboard/JdbcDashboardRepository.java`
- Create `src/main/java/com/dashboardplatform/dashboard/DatabaseMigrationRunner.java`
- Create `src/main/java/com/dashboardplatform/dashboard/DashboardExceptions.java`
- Create `src/main/java/com/dashboardplatform/dashboard/DashboardService.java`

Task 3 requirements:
- Step 1: Create the `dashboards` schema and implement `DatabaseMigrationRunner` to create `schema_history`, inspect applied versions, run `V1__create_dashboards.sql` once, and record version `1` in the same transaction
- Step 2: Define `Dashboard` with `UUID id`, `String name`, `String description`, `String widgetsJson`, `long version`, `Instant createdAt`, `Instant updatedAt`
- Step 2: Define `DashboardRepository` with `findAll`, `findById`, `existsById`, `insert`, `update`, and `delete`
- Step 3: Implement JDBC persistence with `JdbcTemplate`, explicit row mapping, ISO-8601 UTC timestamps, and parameterized SQL
- Step 4: Define `DashboardNotFoundException`, `DashboardVersionConflictException`, and `DashboardValidationException` carrying `Map<String, String> fieldErrors`
- Step 5: Implement service rules using `DashboardRepository`, `Clock`, and a UUID supplier; validate in small private methods; on zero-row update/delete, distinguish not-found from conflict
- Step 6 verification command:
  `D:/AI/dashboard-platform> $env:JAVA_HOME='C:\Program Files\Java\jdk-21'; .\mvnw.cmd '-Dtest=JdbcDashboardRepositoryTest,DashboardServiceTest' test`

Suggested step prompts:

Step 1:
- Only inspect:
  - `D:/AI/dashboard-platform/src/main/resources/db/migration/V1__create_dashboards.sql`
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/dashboard/DatabaseMigrationRunner.java`

Step 2:
- Only inspect:
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/dashboard/Dashboard.java`
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/dashboard/DashboardRepository.java`

Step 3:
- Only inspect:
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/dashboard/JdbcDashboardRepository.java`
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/dashboard/Dashboard.java`
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/dashboard/DashboardRepository.java`

Step 4:
- Only inspect:
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/dashboard/DashboardExceptions.java`

Step 5:
- Only inspect:
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/dashboard/DashboardService.java`
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/dashboard/DashboardRepository.java`
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/dashboard/Dashboard.java`
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/dashboard/DashboardExceptions.java`

Start with:
Implement Task 3 Step [N] only.
