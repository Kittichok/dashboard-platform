Implement only Task 7 from:
`D:/AI/dashboard-platform/docs/superpowers/plans/2026-06-15-dashboard-library-vertical-slice.md`

Project context:
- `D:/AI/dashboard-platform/CONTEXT.md`

Execution rules:
- Keep token usage low
- Use `GPT-5.4 mini` by default for implementation slices
- Escalate to `GPT-5.4` only for review, debugging, or if the mini worker gets stuck
- Work on only one Task 7 step at a time
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

Task 7 scope:
- Create `src/main/frontend/src/dashboard/types.ts`
- Create `src/main/frontend/src/dashboard/dashboardApi.ts`
- Create `src/main/frontend/src/dashboard/DashboardLibrary.tsx`
- Create `src/main/frontend/src/dashboard/DashboardCard.tsx`
- Create `src/main/frontend/src/dashboard/DashboardDialog.tsx`
- Create `src/main/frontend/src/dashboard/CreateDashboardDialog.tsx`
- Create `src/main/frontend/src/dashboard/RenameDashboardDialog.tsx`
- Create `src/main/frontend/src/dashboard/DeleteDashboardDialog.tsx`
- Create `src/main/frontend/src/dashboard/icons.tsx`
- Modify `src/main/frontend/src/App.tsx`
- Create `src/main/frontend/src/styles.css`
- Delete old prototype runtime files only after the React equivalents are working

Task 7 requirements:
- Step 1: Implement typed API operations:
  - `listDashboards(): Promise<Dashboard[]>`
  - `createDashboard(input: DashboardInput): Promise<Dashboard>`
  - `renameDashboard(id: string, input: DashboardInput & { version: number }): Promise<Dashboard>`
  - `duplicateDashboard(id: string): Promise<Dashboard>`
  - `deleteDashboard(id: string, version: number): Promise<void>`
  - Throw discriminated `ApiFailure` and `NetworkFailure` values
- Step 2: Implement dashboard library state in `DashboardLibrary`; keep dashboards, search text, loading state, active dialog, and notice state local; update the local list from successful mutation responses; do not silently refetch or retry conflicts
- Step 3: Implement accessible dialogs through `DashboardDialog`; use labelled inputs, submit buttons, cancel buttons, autofocus, Escape handling, and focus restoration; preserve input after failed submissions
- Step 4: Migrate the prototype visual system into React CSS; preserve sidebar, page header, search toolbar, dashboard cards, responsive breakpoints, focus-visible styles, and reduced-motion behavior; remove deferred data source and dashboard editing controls
- Step 5: Remove the old prototype runtime only after React equivalents are working
- Step 6 verification commands:
  - `D:/AI/dashboard-platform/src/main/frontend> npm.cmd run test:run`
  - `D:/AI/dashboard-platform/src/main/frontend> npm.cmd run build`

Suggested step prompts:

Types:
- Only inspect:
  - `D:/AI/dashboard-platform/src/main/frontend/src/dashboard/types.ts`

Step 1:
- Only inspect:
  - `D:/AI/dashboard-platform/src/main/frontend/src/dashboard/dashboardApi.ts`
  - `D:/AI/dashboard-platform/src/main/frontend/src/dashboard/types.ts`

Step 2:
- Only inspect:
  - `D:/AI/dashboard-platform/src/main/frontend/src/dashboard/DashboardLibrary.tsx`
  - `D:/AI/dashboard-platform/src/main/frontend/src/dashboard/types.ts`
  - `D:/AI/dashboard-platform/src/main/frontend/src/dashboard/dashboardApi.ts`

Step 3a:
- Only inspect:
  - `D:/AI/dashboard-platform/src/main/frontend/src/dashboard/DashboardDialog.tsx`

Step 3b:
- Only inspect:
  - `D:/AI/dashboard-platform/src/main/frontend/src/dashboard/CreateDashboardDialog.tsx`
  - `D:/AI/dashboard-platform/src/main/frontend/src/dashboard/DashboardDialog.tsx`

Step 3c:
- Only inspect:
  - `D:/AI/dashboard-platform/src/main/frontend/src/dashboard/RenameDashboardDialog.tsx`
  - `D:/AI/dashboard-platform/src/main/frontend/src/dashboard/DashboardDialog.tsx`

Step 3d:
- Only inspect:
  - `D:/AI/dashboard-platform/src/main/frontend/src/dashboard/DeleteDashboardDialog.tsx`
  - `D:/AI/dashboard-platform/src/main/frontend/src/dashboard/DashboardDialog.tsx`

Card presentation:
- Only inspect:
  - `D:/AI/dashboard-platform/src/main/frontend/src/dashboard/DashboardCard.tsx`
  - `D:/AI/dashboard-platform/src/main/frontend/src/dashboard/icons.tsx`

App wiring:
- Only inspect:
  - `D:/AI/dashboard-platform/src/main/frontend/src/App.tsx`
  - `D:/AI/dashboard-platform/src/main/frontend/src/dashboard/DashboardLibrary.tsx`

Step 4:
- Only inspect:
  - `D:/AI/dashboard-platform/src/main/frontend/src/styles.css`
  - `D:/AI/dashboard-platform/README.md`

Start with:
Implement Task 7 Step [N] only.
