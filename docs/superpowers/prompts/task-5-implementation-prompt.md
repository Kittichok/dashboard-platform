Implement only Task 5 from:
`D:/AI/dashboard-platform/docs/superpowers/plans/2026-06-15-dashboard-library-vertical-slice.md`

Project context:
- `D:/AI/dashboard-platform/CONTEXT.md`

Execution rules:
- Keep token usage low
- Use `GPT-5.4 mini` by default for implementation slices
- Work on only one Task 5 step at a time
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

Task 5 scope:
- Create `src/main/java/com/dashboardplatform/dashboard/DashboardRequests.java`
- Create `src/main/java/com/dashboardplatform/dashboard/DashboardResponse.java`
- Create `src/main/java/com/dashboardplatform/dashboard/DashboardController.java`
- Create `src/main/java/com/dashboardplatform/web/ApiError.java`
- Create `src/main/java/com/dashboardplatform/web/ApiExceptionHandler.java`
- Create `src/main/java/com/dashboardplatform/web/SpaForwardController.java`

Task 5 requirements:
- Step 1: Define request records with Jakarta validation:
  - `CreateDashboardRequest(@NotBlank @Size(max = 120) String name, @Size(max = 500) String description)`
  - `RenameDashboardRequest(@NotBlank @Size(max = 120) String name, @Size(max = 500) String description, @Positive long version)`
  - `DashboardResponse` includes ID, name, description, parsed widgets, version, created timestamp, and updated timestamp
- Step 2: Implement the five dashboard routes; create and duplicate must return `Location`; delete must return `204`
- Step 3: Implement `ApiError` with `code`, `message`, and `fieldErrors`; map validation, not-found, conflict, and unexpected exceptions; log unexpected exceptions without exposing details
- Step 4: Implement SPA fallback for client routes without a file extension, excluding `/api/**`
- Step 5 verification command:
  `D:/AI/dashboard-platform> $env:JAVA_HOME='C:\Program Files\Java\jdk-21'; .\mvnw.cmd '-Dtest=DashboardControllerTest,SpaForwardControllerTest' test`

Suggested step prompts:

Step 1:
- Only inspect:
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/dashboard/DashboardRequests.java`
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/dashboard/DashboardResponse.java`

Step 2:
- Only inspect:
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/dashboard/DashboardController.java`
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/dashboard/DashboardRequests.java`
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/dashboard/DashboardResponse.java`
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/dashboard/DashboardService.java`

Step 3:
- Only inspect:
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/web/ApiError.java`
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/web/ApiExceptionHandler.java`
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/dashboard/DashboardExceptions.java`

Step 4:
- Only inspect:
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/web/SpaForwardController.java`

Start with:
Implement Task 5 Step [N] only.
