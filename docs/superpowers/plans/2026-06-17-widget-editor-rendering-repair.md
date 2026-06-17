# Widget Editor Rendering Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire existing widget renderer/editor code into the dashboard editor and align widget API response types.

**Architecture:** Keep widget storage as embedded JSON on dashboards. Parse widget response JSON at the backend boundary and normalize responses in the frontend API client. Let `DashboardEditor` own selection, update, reorder, and local widget state.

**Tech Stack:** Spring Boot 3.5, Java 21, React 19, TypeScript 5, Vite 8, Vitest 4, Testing Library

---

## File Structure

- `src/main/java/com/dashboardplatform/widget/WidgetResponse.java`: parse stored widget JSON strings into JSON object fields for API responses.
- `src/main/java/com/dashboardplatform/widget/WidgetController.java`: remove field injection annotation and keep constructor injection.
- `src/test/java/com/dashboardplatform/widget/WidgetResponseTest.java`: verify parsed response shape.
- `src/main/frontend/src/widget/widgetApi.ts`: normalize widget responses and keep request body shape compatible with backend.
- `src/main/frontend/src/widget/__tests__/widgetApi.test.ts`: verify response normalization and endpoint calls.
- `src/main/frontend/src/widget/DashboardEditor.tsx`: use `WidgetRenderer`, open `WidgetEditPanel`, call `updateWidget`, and expose reorder controls.
- `src/main/frontend/src/widget/WidgetEditPanel.tsx`: accept `dashboardId`, preserve current config/source, pass dashboard ID to data-source form.
- `src/main/frontend/src/widget/WidgetDataSourceForm.tsx`: call fetch with the real dashboard ID.
- `src/main/frontend/src/widget/__tests__/DashboardEditor.test.tsx`: cover render, edit, fetch, and reorder flows.
- `src/main/frontend/src/styles.css`: add missing panel and visual classes.

## Task 1: Add Failing Tests

- [ ] Add `WidgetResponseTest` requiring `displayConfig` and `dataSource` object fields in serialized JSON.
- [ ] Add `widgetApi.test.ts` requiring normalization from both parsed and `*Json` response fields.
- [ ] Add `DashboardEditor.test.tsx` requiring rendered widget content, edit panel save, real-dashboard Test Fetch, and reorder API calls.
- [ ] Run:

```powershell
.\mvnw.cmd -Dtest=WidgetResponseTest test
Set-Location src/main/frontend
npm.cmd run test:run -- src/widget/__tests__/widgetApi.test.ts src/widget/__tests__/DashboardEditor.test.tsx
```

Expected: tests fail because the behavior is not implemented.

## Task 2: Fix Backend Widget Response Shape

- [ ] Change `WidgetResponse` fields from `displayConfigJson` and `dataSourceJson` strings to `displayConfig` and `dataSource` maps.
- [ ] Parse blank or null JSON as `null`; parse valid object JSON as `Map<String, Object>`.
- [ ] Throw an unchecked failure for invalid stored widget JSON so corrupted stored data does not silently produce a wrong API contract.
- [ ] Remove `@Autowired` from the `WidgetController` constructor.
- [ ] Run `.\mvnw.cmd -Dtest=WidgetResponseTest test`.

Expected: backend response test passes.

## Task 3: Normalize Frontend Widget API Responses

- [ ] Add a `WidgetResponse` type that accepts either parsed object fields or legacy `displayConfigJson` and `dataSourceJson` strings.
- [ ] Add `normalizeWidget` and `normalizeWidgets` helpers.
- [ ] Use normalization in `listWidgets`, `addWidget`, `updateWidget`, and `reorderWidgets`.
- [ ] Keep mutation request bodies as `WidgetInput` so existing backend request records remain compatible.
- [ ] Run:

```powershell
Set-Location src/main/frontend
npm.cmd run test:run -- src/widget/__tests__/widgetApi.test.ts
```

Expected: widget API tests pass.

## Task 4: Wire Editor Rendering, Editing, Fetch, And Reorder

- [ ] Import `WidgetRenderer`, `WidgetEditPanel`, `updateWidget`, and `reorderWidgets` in `DashboardEditor`.
- [ ] Track `selectedWidgetId`, edit field errors, and edit operation message.
- [ ] Render `WidgetRenderer` inside each widget card.
- [ ] Open `WidgetEditPanel` when a widget card is clicked.
- [ ] Save edits with `updateWidget(id, widget.id, dashboard.version, input)` and replace the widget in local state.
- [ ] Add compact Move Up and Move Down buttons. Disable them at the edges.
- [ ] On move, call `reorderWidgets` with ordered IDs and replace local state with the API response.
- [ ] Pass `dashboardId` through `WidgetEditPanel` to `WidgetDataSourceForm`.
- [ ] Run:

```powershell
Set-Location src/main/frontend
npm.cmd run test:run -- src/widget/__tests__/DashboardEditor.test.tsx
```

Expected: editor tests pass.

## Task 5: Add Missing Styles And Verify

- [ ] Add `.edit-panel-backdrop` and `.edit-panel`.
- [ ] Add `.visual-0`.
- [ ] Run:

```powershell
Set-Location src/main/frontend
npm.cmd run test:run
npm.cmd run build
Set-Location ../../..
.\mvnw.cmd -Dtest=WidgetResponseTest test
```

Expected: targeted and full frontend verification pass, and backend response test passes.
