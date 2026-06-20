# Selected Fields Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Always show a raw `selectedFields` editor in the widget editor for field-selectable widgets, and keep it synchronized with field checkboxes when response fields exist.

**Architecture:** Reuse the existing `displayConfig.selectedFields` model and `WidgetFieldSelector`. Add a small raw JSON textarea beside/under the selector inside `WidgetDataSourceForm`; parse it into display config and surface invalid JSON inline.

**Tech Stack:** React 19, TypeScript, React Testing Library, Vitest.

---

### Task 1: Raw `selectedFields` Editor

**Files:**
- Modify: `src/main/frontend/src/widget/WidgetDataSourceForm.tsx`
- Test: `src/main/frontend/src/widget/__tests__/DashboardEditor.test.tsx`

- [ ] **Step 1: Write failing tests**

Add tests that open a JSON Preview widget, see `selectedFields` before fetch, edit it to save raw config, then verify checkboxes and raw JSON stay synchronized after test fetch.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm.cmd run test:run -- src/widget/__tests__/DashboardEditor.test.tsx`
Expected: FAIL because `selectedFields` textarea does not exist.

- [ ] **Step 3: Implement minimal UI**

Add a textarea labeled `selectedFields` for `table` and `json_preview` widgets. Its value is a JSON array derived from `displayConfig.selectedFields`; valid array-of-string edits call `withSelectedFields`, invalid edits show an inline error.

- [ ] **Step 4: Verify**

Run: `npm.cmd run test:run -- src/widget/__tests__/DashboardEditor.test.tsx`
Expected: PASS.
