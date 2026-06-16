Implement only Task 4 from:
`D:/AI/dashboard-platform/docs/superpowers/plans/2026-06-15-dashboard-library-vertical-slice.md`

Project context:
- `D:/AI/dashboard-platform/CONTEXT.md`

Execution rules:
- Keep token usage low
- Use `GPT-5.4 mini` by default for implementation slices
- Work on only one Task 4 step at a time
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

Task 4 scope:
- Create `src/test/java/com/dashboardplatform/dashboard/DashboardControllerTest.java`
- Create `src/test/java/com/dashboardplatform/web/SpaForwardControllerTest.java`

Task 4 requirements:
- Step 1: Write `MockMvc` controller tests for:
  - `GET /api/dashboards` returns dashboard summaries
  - `POST /api/dashboards` returns `201` and a `Location` header
  - `PATCH /api/dashboards/{id}` returns the incremented version
  - `POST /api/dashboards/{id}/duplicate` returns `201`
  - `DELETE /api/dashboards/{id}?version=...` returns `204`
  - Validation errors return `400` with stable `code`, `message`, and `fieldErrors`
  - Missing dashboards return `404`
  - Stale mutations return `409` with `dashboard_version_conflict`
  - Unexpected errors return sanitized `500` responses
- Step 2: Write SPA fallback tests so non-file, non-API browser routes forward to `/index.html`, while `/api/**` and requests containing a filename extension are not forwarded
- Step 3 verification command:
  `D:/AI/dashboard-platform> $env:JAVA_HOME='C:\Program Files\Java\jdk-21'; .\mvnw.cmd '-Dtest=DashboardControllerTest,SpaForwardControllerTest' test`
- Expected Task 4 state from the plan: RED because controller, error handler, and SPA fallback may not exist yet

Suggested step prompts:

Step 1:
- Only inspect:
  - `D:/AI/dashboard-platform/src/test/java/com/dashboardplatform/dashboard/DashboardControllerTest.java`
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/dashboard/DashboardController.java`
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/web/ApiExceptionHandler.java`

Step 2:
- Only inspect:
  - `D:/AI/dashboard-platform/src/test/java/com/dashboardplatform/web/SpaForwardControllerTest.java`
  - `D:/AI/dashboard-platform/src/main/java/com/dashboardplatform/web/SpaForwardController.java`

Start with:
Implement Task 4 Step [N] only.
