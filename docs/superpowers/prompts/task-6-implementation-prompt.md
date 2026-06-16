Implement only Task 6 from:
`D:/AI/dashboard-platform/docs/superpowers/plans/2026-06-15-dashboard-library-vertical-slice.md`

Project context:
- `D:/AI/dashboard-platform/CONTEXT.md`

Execution rules:
- Keep token usage low
- Use `GPT-5.4 mini` by default for implementation slices
- Work on only one Task 6 step at a time
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

Task 6 scope:
- Create `src/main/frontend/src/dashboard/__tests__/dashboardApi.test.ts`
- Create `src/main/frontend/src/dashboard/__tests__/DashboardLibrary.test.tsx`
- Create `src/main/frontend/src/test/setup.ts`

Task 6 requirements:
- Step 1: Write API client tests covering:
  - Correct methods, paths, query values, and JSON bodies
  - Successful JSON decoding
  - `204` deletion handling
  - Structured API error decoding
  - Network failures represented separately from API failures
- Step 2: Write dashboard library interaction tests covering:
  - Loading and initial dashboard rendering
  - Empty-library and no-search-results states
  - Case-insensitive name and description search
  - Create, rename, duplicate, and delete requests
  - Explicit delete confirmation
  - Immediate name/description validation
  - Conflict errors leave the dialog open and preserve typed input
  - Unexpected failures show a dismissible notice
- Use Mock Service Worker or a small fetch stub at the HTTP boundary; do not mock React components
- Step 3 verification command:
  `D:/AI/dashboard-platform/src/main/frontend> npm.cmd run test:run`
- Expected Task 6 state from the plan: RED because the dashboard API and components may not exist yet

Suggested step prompts:

Step 1:
- Only inspect:
  - `D:/AI/dashboard-platform/src/main/frontend/src/dashboard/__tests__/dashboardApi.test.ts`
  - `D:/AI/dashboard-platform/src/main/frontend/src/dashboard/dashboardApi.ts`
  - `D:/AI/dashboard-platform/src/main/frontend/src/dashboard/types.ts`

Step 2:
- Only inspect:
  - `D:/AI/dashboard-platform/src/main/frontend/src/dashboard/__tests__/DashboardLibrary.test.tsx`
  - `D:/AI/dashboard-platform/src/main/frontend/src/test/setup.ts`
  - `D:/AI/dashboard-platform/src/main/frontend/src/dashboard/DashboardLibrary.tsx`

Start with:
Implement Task 6 Step [N] only.
