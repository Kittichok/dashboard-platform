# Widget Nested Response Field Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Table and JSON Preview widgets select and render nested JSON response fields such as `detail.obj.key` and `detail.name`.

**Architecture:** Keep using `displayConfig.selectedFields: string[]`, but upgrade the stored values from top-level keys to dotted field paths for nested object properties. Reuse the existing Test Fetch workflow and checkbox UI, teach the field-extraction/filtering helpers to traverse nested objects, and update renderers to resolve path values and rebuild filtered nested JSON without changing backend persistence.

**Tech Stack:** React 19, TypeScript 5, Vite 8, Vitest 4, React Testing Library, existing widget `displayConfigJson` persistence.

---

## File Structure

- Modify `src/main/frontend/src/widget/displayConfig.ts`
  - Own dotted-path extraction, path lookup, and nested filtered-object reconstruction.
- Modify `src/main/frontend/src/widget/WidgetRenderer.tsx`
  - Table resolves cell values by dotted path and JSON Preview renders only the selected nested branches.
- Modify `src/main/frontend/src/widget/WidgetDataSourceForm.tsx`
  - No new state model; it should surface the new dotted path choices returned by `extractSelectableFields`.
- Modify `src/main/frontend/src/widget/WidgetFieldSelector.tsx`
  - Only if spacing/readability needs a small tweak once path labels become longer.
- Modify `src/main/frontend/src/widget/__tests__/displayConfig.test.ts`
  - Unit coverage for nested path extraction, lookup, and filtered JSON reconstruction.
- Modify `src/main/frontend/src/widget/__tests__/WidgetRenderer.test.tsx`
  - Renderer regression tests for nested table columns and nested JSON Preview filtering.
- Modify `src/main/frontend/src/widget/__tests__/DashboardEditor.test.tsx`
  - Integration proof that a visitor can Test Fetch nested JSON, pick nested paths, save, and persist them unchanged.

## Path Rules

Use this path format:

```ts
"detail"
"detail.obj"
"detail.obj.key"
"detail.name"
```

Rules:

- Paths are dot-separated object-property paths.
- For top-level array responses, paths are relative to each row item.
- Nested object properties must be selectable.
- Nested arrays are selectable only as their parent field (for example `detail.items`) in this plan; no per-index or `[]` syntax is introduced.
- Existing top-level selections such as `name` remain valid.
- `selectedFields` stays optional; empty still means "show all fields".
- Table headers show the stored path string exactly.
- JSON Preview reconstructs the smallest nested object containing only the selected paths.

---

### Task 1: Lock Down Nested Path Behavior in Helper Tests

**Files:**
- Modify: `src/main/frontend/src/widget/__tests__/displayConfig.test.ts`
- Test: `src/main/frontend/src/widget/__tests__/displayConfig.test.ts`

- [ ] **Step 1: Add failing nested extraction tests**

Append these tests inside `describe("displayConfig helpers", () => { ... })` in `src/main/frontend/src/widget/__tests__/displayConfig.test.ts`:

```ts
  it("extracts nested object paths from object responses", () => {
    expect(extractSelectableFields({
      name: "Adeel Solangi",
      language: "Sindhi",
      detail: {
        obj: { key: "value" },
        name: "test"
      }
    })).toEqual([
      "name",
      "language",
      "detail",
      "detail.obj",
      "detail.obj.key",
      "detail.name"
    ]);
  });

  it("extracts first-seen nested paths from array object responses", () => {
    expect(extractSelectableFields([
      {
        id: 1,
        detail: {
          obj: { key: "value" }
        }
      },
      {
        id: 2,
        detail: {
          status: "ok"
        }
      }
    ])).toEqual([
      "id",
      "detail",
      "detail.obj",
      "detail.obj.key",
      "detail.status"
    ]);
  });
```

- [ ] **Step 2: Add failing nested filtering tests**

Append these tests in the same file:

```ts
  it("filters object responses to nested selected fields", () => {
    expect(filterDataToFields({
      name: "Adeel Solangi",
      language: "Sindhi",
      detail: {
        obj: { key: "value", extra: "ignore" },
        name: "test"
      }
    }, ["detail.obj.key", "detail.name"])).toEqual({
      detail: {
        obj: { key: "value" },
        name: "test"
      }
    });
  });

  it("filters each array row to nested selected fields", () => {
    expect(filterDataToFields([
      {
        id: 1,
        detail: {
          obj: { key: "value-1" },
          name: "first"
        }
      },
      {
        id: 2,
        detail: {
          obj: { key: "value-2" },
          name: "second"
        }
      }
    ], ["detail.obj.key"])).toEqual([
      { detail: { obj: { key: "value-1" } } },
      { detail: { obj: { key: "value-2" } } }
    ]);
  });
```

- [ ] **Step 3: Run the helper tests to verify they fail**

Run:

```powershell
cd src/main/frontend
npm.cmd run test:run -- src/widget/__tests__/displayConfig.test.ts
```

Expected: FAIL because `extractSelectableFields` only returns top-level keys and `filterDataToFields` only copies top-level properties.

- [ ] **Step 4: Commit the failing-test checkpoint if your workflow wants one**

```powershell
git add src/main/frontend/src/widget/__tests__/displayConfig.test.ts
git commit -m "test: define nested widget field path behavior"
```

If you prefer red-green in one commit, skip this commit and continue.

---

### Task 2: Implement Dotted Path Extraction and Filtering

**Files:**
- Modify: `src/main/frontend/src/widget/displayConfig.ts`
- Test: `src/main/frontend/src/widget/__tests__/displayConfig.test.ts`

- [ ] **Step 1: Replace the helper implementation with dotted-path support**

Update `src/main/frontend/src/widget/displayConfig.ts` to this shape:

```ts
export interface WidgetDisplayConfig {
  selectedFields?: string[];
  columns?: string[];
  value?: string;
  content?: string;
  [key: string]: unknown;
}

export function selectedFieldsFromConfig(config: Record<string, unknown> | null | undefined): string[] {
  if (!config || !Array.isArray(config.selectedFields)) {
    return [];
  }
  if (!config.selectedFields.every((field) => typeof field === "string")) {
    return [];
  }
  return config.selectedFields;
}

export function legacyColumnsFromConfig(config: Record<string, unknown> | null | undefined): string[] {
  if (!config || !Array.isArray(config.columns)) {
    return [];
  }
  if (!config.columns.every((field) => typeof field === "string")) {
    return [];
  }
  return config.columns;
}

export function withSelectedFields(
  config: Record<string, unknown> | null | undefined,
  selectedFields: string[]
): Record<string, unknown> | null {
  const next = { ...(config ?? {}) };
  if (selectedFields.length > 0) {
    next.selectedFields = selectedFields;
  } else {
    delete next.selectedFields;
  }
  return Object.keys(next).length > 0 ? next : null;
}

export function extractSelectableFields(data: unknown): string[] {
  const fields: string[] = [];
  const seen = new Set<string>();

  function addField(path: string) {
    if (!seen.has(path)) {
      seen.add(path);
      fields.push(path);
    }
  }

  function visitRecord(record: Record<string, unknown>, prefix?: string) {
    for (const [key, value] of Object.entries(record)) {
      const path = prefix ? `${prefix}.${key}` : key;
      addField(path);

      if (isRecord(value)) {
        visitRecord(value, path);
      }
    }
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      if (isRecord(item)) {
        visitRecord(item);
      }
    }
    return fields;
  }

  if (isRecord(data)) {
    visitRecord(data);
    return fields;
  }

  return [];
}

export function filterDataToFields(data: unknown, fields: string[] | undefined): unknown {
  if (!fields || fields.length === 0) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => (isRecord(item) ? pickFields(item, fields) : item));
  }
  if (isRecord(data)) {
    return pickFields(data, fields);
  }
  return data;
}

export function fieldValueAtPath(data: unknown, path: string): unknown {
  const segments = path.split(".");
  let current: unknown = data;

  for (const segment of segments) {
    if (!isRecord(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

function pickFields(record: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const picked: Record<string, unknown> = {};

  for (const field of fields) {
    const value = fieldValueAtPath(record, field);
    if (value !== undefined) {
      assignPath(picked, field, value);
    }
  }

  return picked;
}

function assignPath(target: Record<string, unknown>, path: string, value: unknown) {
  const segments = path.split(".");
  let current = target;

  for (const segment of segments.slice(0, -1)) {
    const next = current[segment];
    if (!isRecord(next)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }

  current[segments[segments.length - 1]] = value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

- [ ] **Step 2: Run helper tests to verify they pass**

Run:

```powershell
cd src/main/frontend
npm.cmd run test:run -- src/widget/__tests__/displayConfig.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit the helper implementation**

```powershell
git add src/main/frontend/src/widget/displayConfig.ts src/main/frontend/src/widget/__tests__/displayConfig.test.ts
git commit -m "feat: support nested widget response field paths"
```

---

### Task 3: Teach Renderers to Resolve Nested Paths

**Files:**
- Modify: `src/main/frontend/src/widget/WidgetRenderer.tsx`
- Modify: `src/main/frontend/src/widget/__tests__/WidgetRenderer.test.tsx`

- [ ] **Step 1: Add failing nested renderer tests**

Append these tests inside `describe("WidgetRenderer response states", () => { ... })` in `src/main/frontend/src/widget/__tests__/WidgetRenderer.test.tsx`:

```tsx
  it("table widget renders nested selected field paths as columns", () => {
    render(
      <WidgetRenderer
        widget={widget({ type: "table", displayConfig: { selectedFields: ["detail.obj.key", "detail.name"] } })}
        fetchData={ok([
          {
            id: 1,
            detail: {
              obj: { key: "value" },
              name: "test"
            }
          }
        ])}
      />
    );

    expect(screen.getByRole("columnheader", { name: "detail.obj.key" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "detail.name" })).toBeInTheDocument();
    expect(screen.getByText("value")).toBeInTheDocument();
    expect(screen.getByText("test")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "id" })).not.toBeInTheDocument();
  });

  it("json_preview widget filters to nested selected field paths", () => {
    render(
      <WidgetRenderer
        widget={widget({ type: "json_preview", displayConfig: { selectedFields: ["detail.obj.key"] } })}
        fetchData={ok({
          name: "Adeel Solangi",
          detail: {
            obj: { key: "value", extra: "ignore" },
            name: "test"
          }
        })}
      />
    );

    expect(screen.getByText(/"detail"/)).toBeInTheDocument();
    expect(screen.getByText(/"key": "value"/)).toBeInTheDocument();
    expect(screen.queryByText(/"name": "Adeel Solangi"/)).not.toBeInTheDocument();
    expect(screen.queryByText(/extra/)).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run renderer tests to verify they fail**

Run:

```powershell
cd src/main/frontend
npm.cmd run test:run -- src/widget/__tests__/WidgetRenderer.test.tsx
```

Expected: FAIL because the table still reads `row[col]` and cannot resolve dotted paths.

- [ ] **Step 3: Import path lookup into the renderer**

At the top of `src/main/frontend/src/widget/WidgetRenderer.tsx`, change the import to:

```ts
import {
  fieldValueAtPath,
  filterDataToFields,
  legacyColumnsFromConfig,
  selectedFieldsFromConfig
} from "./displayConfig";
```

- [ ] **Step 4: Update table cell rendering to resolve dotted paths**

Inside `TableWidget`, replace the current cell body expression:

```tsx
                  {String(row[col] ?? "")}
```

with:

```tsx
                  {formatTableCellValue(fieldValueAtPath(row, col))}
```

Then add these helpers near `NoDataDisplay`:

```ts
function formatTableCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "\u2014";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
```

This preserves the existing top-level case while making nested paths work and aligning missing values with the Workspace rules.

- [ ] **Step 5: Keep JSON Preview filtering path-aware**

No structural renderer change is needed beyond Task 2 if `JsonPreviewWidget` already calls:

```tsx
        {JSON.stringify(
          filterDataToFields(fetchData.data, selectedFieldsFromConfig(widget.displayConfig)),
          null,
          2
        )}
```

If the file drifted, restore that exact code before continuing.

- [ ] **Step 6: Run renderer tests to verify they pass**

Run:

```powershell
cd src/main/frontend
npm.cmd run test:run -- src/widget/__tests__/WidgetRenderer.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/main/frontend/src/widget/WidgetRenderer.tsx src/main/frontend/src/widget/__tests__/WidgetRenderer.test.tsx
git commit -m "feat: render nested widget response field paths"
```

---

### Task 4: Prove the Editor Can Save Nested Selected Paths

**Files:**
- Modify: `src/main/frontend/src/widget/__tests__/DashboardEditor.test.tsx`
- Modify: `src/main/frontend/src/widget/WidgetDataSourceForm.tsx`
- Optional Modify: `src/main/frontend/src/widget/WidgetFieldSelector.tsx`

- [ ] **Step 1: Replace the existing flat-field integration test with a nested-path test**

In `src/main/frontend/src/widget/__tests__/DashboardEditor.test.tsx`, replace the current `"saves selected display fields from a tested JSON Preview data source"` test body with:

```tsx
  it("saves nested selected display fields from a tested JSON Preview data source", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([jsonPreviewWidget]));
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // listTables
    fetchMock.mockResolvedValueOnce(jsonResponse({
      name: "Adeel Solangi",
      language: "Sindhi",
      detail: {
        obj: { key: "value" },
        name: "test"
      }
    }));
    fetchMock.mockResolvedValueOnce(jsonResponse({
      ...jsonPreviewWidget,
      displayConfig: { selectedFields: ["detail.obj.key", "detail.name"] }
    }));

    renderEditor();

    const card = (await screen.findByRole("heading", { name: "Users" })).closest("article");
    expect(card).not.toBeNull();
    await user.click(card!);

    const panel = screen.getByRole("dialog", { name: /edit widget/i });
    await user.click(within(panel).getByRole("button", { name: /test fetch/i }));

    await user.click(await within(panel).findByRole("checkbox", { name: "detail.obj.key" }));
    await user.click(within(panel).getByRole("checkbox", { name: "detail.name" }));
    await user.click(within(panel).getByRole("button", { name: /save/i }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/dashboards/dashboard-1/widgets/widget-3?dashboardVersion=4",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          title: "Users",
          type: "json_preview",
          x: 0,
          y: 2,
          w: 3,
          h: 2,
          displayConfigJson: JSON.stringify({ selectedFields: ["detail.obj.key", "detail.name"] }),
          dataSourceJson: JSON.stringify(jsonPreviewWidget.dataSource)
        })
      })
    );
  });
```

- [ ] **Step 2: Run the editor test to verify it fails if nested paths are not surfaced**

Run:

```powershell
cd src/main/frontend
npm.cmd run test:run -- src/widget/__tests__/DashboardEditor.test.tsx
```

Expected: FAIL until `extractSelectableFields` starts returning dotted nested paths.

- [ ] **Step 3: Keep the form simple unless readability is poor**

If `src/main/frontend/src/widget/WidgetDataSourceForm.tsx` already does this, do not add extra logic:

```ts
  const selectableFields = isSuccessfulFetchResult(fetchResult) ? extractSelectableFields(fetchResult.data) : [];
```

If the line differs, restore it so the form automatically picks up the nested path list from Task 2.

Only if the checkbox labels wrap badly, change the selector label container in `src/main/frontend/src/widget/WidgetFieldSelector.tsx` from:

```tsx
              alignItems: "center",
```

to:

```tsx
              alignItems: "flex-start",
```

and add:

```tsx
              lineHeight: 1.4,
```

This is the only styling change this plan should need.

- [ ] **Step 4: Run the editor test again to verify it passes**

Run:

```powershell
cd src/main/frontend
npm.cmd run test:run -- src/widget/__tests__/DashboardEditor.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/main/frontend/src/widget/__tests__/DashboardEditor.test.tsx src/main/frontend/src/widget/WidgetDataSourceForm.tsx src/main/frontend/src/widget/WidgetFieldSelector.tsx
git commit -m "test: persist nested widget response field paths"
```

If `WidgetDataSourceForm.tsx` and `WidgetFieldSelector.tsx` were unchanged, omit them from `git add`.

---

### Task 5: Full Verification

**Files:**
- No code changes unless verification exposes a defect.

- [ ] **Step 1: Run focused widget tests**

Run:

```powershell
cd src/main/frontend
npm.cmd run test:run -- src/widget/__tests__/displayConfig.test.ts src/widget/__tests__/WidgetRenderer.test.tsx src/widget/__tests__/DashboardEditor.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run the full frontend test suite**

Run:

```powershell
cd src/main/frontend
npm.cmd run test:run
```

Expected: PASS.

- [ ] **Step 3: Run the frontend build**

Run:

```powershell
cd src/main/frontend
npm.cmd run build
```

Expected: PASS.

- [ ] **Step 4: Manual smoke test**

Run frontend:

```powershell
cd src/main/frontend
npm.cmd run dev
```

Run backend in another terminal:

```powershell
.\mvnw.cmd spring-boot:run
```

Manual expected flow:

1. Open `http://localhost:5173`.
2. Edit a JSON Preview widget backed by a REST API response like `{ "name": "Adeel Solangi", "language": "Sindhi", "detail": { "obj": { "key": "value" }, "name": "test" } }`.
3. Click `Test Fetch`.
4. Confirm `detail`, `detail.obj`, `detail.obj.key`, and `detail.name` appear under `Display fields`.
5. Select `detail.obj.key` and `detail.name`.
6. Save the widget.
7. View the widget and confirm the JSON Preview shows only the nested selected branches.
8. Repeat with a Table widget whose response rows contain nested `detail` objects, and confirm the table headers are the dotted paths and the cell values render `value` and `test`.

- [ ] **Step 5: Final commit if verification required follow-up fixes**

```powershell
git add src/main/frontend/src/widget
git commit -m "fix: stabilize nested widget response field selection"
```

If no fixes were required, no final commit is needed.

---

## Self-Review

**Spec coverage:** The plan covers nested selection from JSON responses, saving nested `selectedFields`, rendering nested JSON Preview branches, and resolving nested values in Table widgets.

**Placeholder scan:** No `TODO`, `TBD`, or "handle appropriately" placeholders remain; each task names exact files, concrete code, and exact commands.

**Type consistency:** The plan consistently uses `selectedFields: string[]`, `extractSelectableFields`, `filterDataToFields`, `fieldValueAtPath`, `WidgetDataSourceForm`, and `WidgetRenderer`.

**Intentional non-scope:** No backend schema changes, no indexed array path syntax, and no new widget types are introduced. This keeps the change aligned with the user's request for multi-layer object selection.
