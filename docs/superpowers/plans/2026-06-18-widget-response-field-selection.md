# Widget Response Field Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Table and JSON Preview widgets choose which fields from a fetched data-source response are displayed.

**Architecture:** Store selected response fields in each widget's `displayConfig` as `selectedFields: string[]`. Add small frontend helpers to derive field names from fetched JSON and filter rendered output, then wire the existing edit panel's Test Fetch flow to a multi-select checkbox group. Backend remains pass-through because widgets already persist arbitrary `displayConfigJson`.

**Tech Stack:** React 19, TypeScript 5, Vite 8, Vitest 4, React Testing Library, existing Spring Boot widget JSON persistence.

---

## File Structure

- Create `src/main/frontend/src/widget/displayConfig.ts`
  - Owns typed access to `displayConfig.selectedFields`, response field extraction, and field filtering for display.
- Create `src/main/frontend/src/widget/__tests__/displayConfig.test.ts`
  - Unit tests for field extraction and filtering edge cases.
- Create `src/main/frontend/src/widget/WidgetFieldSelector.tsx`
  - Reusable multi-select checkbox UI for Table and JSON Preview.
- Modify `src/main/frontend/src/widget/WidgetRenderer.tsx`
  - Table uses `selectedFields` before falling back to existing `columns`.
  - JSON Preview renders filtered data when `selectedFields` is present.
- Modify `src/main/frontend/src/widget/WidgetDataSourceForm.tsx`
  - Keeps Test Fetch response, derives field options, and renders field selector for Table and JSON Preview.
  - Emits display config changes upward.
- Modify `src/main/frontend/src/widget/WidgetEditPanel.tsx`
  - Owns editable `displayConfig` state and submits it instead of the original saved config.
- Modify `src/main/frontend/src/widget/__tests__/WidgetRenderer.test.tsx`
  - Renderer regression tests for selected fields.
- Modify `src/main/frontend/src/widget/__tests__/DashboardEditor.test.tsx`
  - Integration test proving a user can Test Fetch, choose fields, save, and persist `displayConfigJson`.
- Optional modify `src/main/frontend/src/styles.css`
  - Only if the inline selector styling becomes hard to keep readable.

## Display Config Shape

Use this minimal shape:

```ts
export interface WidgetDisplayConfig {
  selectedFields?: string[];
  columns?: string[];
  value?: string;
  content?: string;
  [key: string]: unknown;
}
```

Rules:

- `selectedFields` is the new renderer preference for both `table` and `json_preview`.
- Existing `columns` remains supported for table widgets as a backward-compatible fallback.
- An empty or missing `selectedFields` means "display all fields".
- Only top-level fields are selected in this plan. Nested objects remain as values in their selected top-level field.
- For array responses, derive selectable fields from object items in array order, preserving first-seen field order.
- For object responses, derive selectable fields from top-level keys.
- For primitive responses, no selector appears and rendering remains unchanged.

---

### Task 1: Add Display Config Helpers

**Files:**
- Create: `src/main/frontend/src/widget/displayConfig.ts`
- Create: `src/main/frontend/src/widget/__tests__/displayConfig.test.ts`

- [ ] **Step 1: Write failing helper tests**

Create `src/main/frontend/src/widget/__tests__/displayConfig.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  extractSelectableFields,
  filterDataToFields,
  selectedFieldsFromConfig,
  withSelectedFields
} from "../displayConfig";

describe("displayConfig helpers", () => {
  it("extracts top-level fields from object responses", () => {
    expect(extractSelectableFields({ id: 1, name: "Ada", active: true })).toEqual([
      "id",
      "name",
      "active"
    ]);
  });

  it("extracts first-seen fields from array object responses", () => {
    expect(extractSelectableFields([
      { id: 1, name: "Ada" },
      { email: "ada@example.test", name: "Ada Lovelace" }
    ])).toEqual(["id", "name", "email"]);
  });

  it("does not offer fields for primitive responses", () => {
    expect(extractSelectableFields(null)).toEqual([]);
    expect(extractSelectableFields("ready")).toEqual([]);
    expect(extractSelectableFields(42)).toEqual([]);
  });

  it("filters object responses to selected fields", () => {
    expect(filterDataToFields({ id: 1, name: "Ada", active: true }, ["name", "active"])).toEqual({
      name: "Ada",
      active: true
    });
  });

  it("filters each row in array responses to selected fields", () => {
    expect(filterDataToFields([
      { id: 1, name: "Ada", active: true },
      { id: 2, name: "Grace", active: false }
    ], ["name"])).toEqual([
      { name: "Ada" },
      { name: "Grace" }
    ]);
  });

  it("returns original data when no fields are selected", () => {
    const data = { id: 1, name: "Ada" };
    expect(filterDataToFields(data, [])).toBe(data);
    expect(filterDataToFields(data, undefined)).toBe(data);
  });

  it("reads selected fields from a display config object only", () => {
    expect(selectedFieldsFromConfig({ selectedFields: ["id", "name"] })).toEqual(["id", "name"]);
    expect(selectedFieldsFromConfig({ selectedFields: [1, "name"] })).toEqual([]);
    expect(selectedFieldsFromConfig(null)).toEqual([]);
  });

  it("writes selected fields without mutating existing config", () => {
    const original = { content: "fallback" };
    expect(withSelectedFields(original, ["id"])).toEqual({ content: "fallback", selectedFields: ["id"] });
    expect(original).toEqual({ content: "fallback" });
    expect(withSelectedFields(original, [])).toEqual({ content: "fallback" });
  });
});
```

- [ ] **Step 2: Run helper tests to verify they fail**

Run:

```powershell
cd src/main/frontend
npm.cmd run test:run -- src/widget/__tests__/displayConfig.test.ts
```

Expected: FAIL because `../displayConfig` does not exist.

- [ ] **Step 3: Implement helper module**

Create `src/main/frontend/src/widget/displayConfig.ts`:

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

  function addField(field: string) {
    if (!seen.has(field)) {
      seen.add(field);
      fields.push(field);
    }
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      if (isRecord(item)) {
        Object.keys(item).forEach(addField);
      }
    }
    return fields;
  }

  if (isRecord(data)) {
    return Object.keys(data);
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

function pickFields(record: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(record, field)) {
      picked[field] = record[field];
    }
  }
  return picked;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

- [ ] **Step 4: Run helper tests to verify they pass**

Run:

```powershell
cd src/main/frontend
npm.cmd run test:run -- src/widget/__tests__/displayConfig.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/main/frontend/src/widget/displayConfig.ts src/main/frontend/src/widget/__tests__/displayConfig.test.ts
git commit -m "feat: add widget display field helpers"
```

---

### Task 2: Apply Selected Fields in Renderers

**Files:**
- Modify: `src/main/frontend/src/widget/WidgetRenderer.tsx`
- Modify: `src/main/frontend/src/widget/__tests__/WidgetRenderer.test.tsx`

- [ ] **Step 1: Add failing renderer tests**

Append these tests inside the existing `describe("WidgetRenderer response states", () => { ... })` block in `src/main/frontend/src/widget/__tests__/WidgetRenderer.test.tsx`:

```tsx
  it("table widget displays only selected response fields", () => {
    render(
      <WidgetRenderer
        widget={widget({ type: "table", displayConfig: { selectedFields: ["name"] } })}
        fetchData={ok([{ id: 1, name: "Alice", secret: "hidden" }])}
      />
    );

    expect(screen.getByRole("columnheader", { name: "name" })).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "id" })).not.toBeInTheDocument();
    expect(screen.queryByText("hidden")).not.toBeInTheDocument();
  });

  it("table widget keeps legacy columns as fallback", () => {
    render(
      <WidgetRenderer
        widget={widget({ type: "table", displayConfig: { columns: ["name"] } })}
        fetchData={ok([{ id: 1, name: "Alice" }])}
      />
    );

    expect(screen.getByRole("columnheader", { name: "name" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "id" })).not.toBeInTheDocument();
  });

  it("json_preview widget displays only selected response fields", () => {
    render(
      <WidgetRenderer
        widget={widget({ type: "json_preview", displayConfig: { selectedFields: ["name"] } })}
        fetchData={ok({ id: 1, name: "Alice", secret: "hidden" })}
      />
    );

    expect(screen.getByText(/"name": "Alice"/)).toBeInTheDocument();
    expect(screen.queryByText(/"id": 1/)).not.toBeInTheDocument();
    expect(screen.queryByText(/hidden/)).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run renderer tests to verify they fail**

Run:

```powershell
cd src/main/frontend
npm.cmd run test:run -- src/widget/__tests__/WidgetRenderer.test.tsx
```

Expected: FAIL because JSON Preview ignores `selectedFields`; table may still rely on legacy `columns`.

- [ ] **Step 3: Update renderer imports**

At the top of `src/main/frontend/src/widget/WidgetRenderer.tsx`, change:

```ts
import type { Widget, WidgetFetchResult } from "./types";
```

to:

```ts
import {
  filterDataToFields,
  legacyColumnsFromConfig,
  selectedFieldsFromConfig
} from "./displayConfig";
import type { Widget, WidgetFetchResult } from "./types";
```

- [ ] **Step 4: Update table column selection**

In `TableWidget`, replace both occurrences of:

```ts
const columns = (widget.displayConfig?.columns as string[]) ?? [];
```

with:

```ts
const selectedFields = selectedFieldsFromConfig(widget.displayConfig);
const columns = selectedFields.length > 0
  ? selectedFields
  : legacyColumnsFromConfig(widget.displayConfig);
```

This preserves existing table widgets while letting the new config win.

- [ ] **Step 5: Update JSON Preview filtering**

In `JsonPreviewWidget`, replace:

```tsx
        {JSON.stringify(fetchData.data, null, 2)}
```

with:

```tsx
        {JSON.stringify(
          filterDataToFields(fetchData.data, selectedFieldsFromConfig(widget.displayConfig)),
          null,
          2
        )}
```

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
git commit -m "feat: filter widget renderers by selected fields"
```

---

### Task 3: Add Reusable Field Selector UI

**Files:**
- Create: `src/main/frontend/src/widget/WidgetFieldSelector.tsx`

- [ ] **Step 1: Create selector component**

Create `src/main/frontend/src/widget/WidgetFieldSelector.tsx`:

```tsx
type WidgetFieldSelectorProps = {
  fields: string[];
  selectedFields: string[];
  onChange: (fields: string[]) => void;
};

export function WidgetFieldSelector({
  fields,
  selectedFields,
  onChange
}: WidgetFieldSelectorProps) {
  if (fields.length === 0) {
    return null;
  }

  function toggleField(field: string) {
    if (selectedFields.includes(field)) {
      onChange(selectedFields.filter((item) => item !== field));
    } else {
      onChange([...selectedFields, field]);
    }
  }

  function selectAll() {
    onChange(fields);
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div style={{ marginTop: "12px", marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
        <span style={{ display: "block", fontSize: "10px", fontWeight: 750, color: "var(--muted)", textTransform: "uppercase" }}>
          Display fields
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          <button type="button" className="button secondary" onClick={selectAll} style={{ fontSize: "12px", padding: "4px 8px" }}>
            Select all
          </button>
          <button type="button" className="button secondary" onClick={clearAll} style={{ fontSize: "12px", padding: "4px 8px" }}>
            Clear
          </button>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {fields.map((field) => (
          <label
            key={field}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "6px",
              border: "1px solid var(--line)",
              background: selectedFields.includes(field) ? "var(--blue-100, #e0edff)" : "var(--surface-warm)"
            }}
          >
            <input
              type="checkbox"
              checked={selectedFields.includes(field)}
              onChange={() => toggleField(field)}
            />
            {field}
          </label>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript build**

Run:

```powershell
cd src/main/frontend
npm.cmd run build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```powershell
git add src/main/frontend/src/widget/WidgetFieldSelector.tsx
git commit -m "feat: add widget field selector"
```

---

### Task 4: Wire Field Selector Into Edit Panel Test Fetch

**Files:**
- Modify: `src/main/frontend/src/widget/WidgetEditPanel.tsx`
- Modify: `src/main/frontend/src/widget/WidgetDataSourceForm.tsx`

- [ ] **Step 1: Update edit panel display-config state**

In `src/main/frontend/src/widget/WidgetEditPanel.tsx`, after the existing `dataSource` state:

```ts
  const [displayConfig, setDisplayConfig] = useState<Record<string, unknown> | null>(
    widget.displayConfig
  );
```

Then in `submit`, replace:

```ts
      displayConfig: widget.displayConfig,
```

with:

```ts
      displayConfig,
```

Finally replace:

```tsx
          <WidgetDataSourceForm dashboardId={dashboardId} widget={widget} onChange={setDataSource} />
```

with:

```tsx
          <WidgetDataSourceForm
            dashboardId={dashboardId}
            widget={widget}
            displayConfig={displayConfig}
            onChange={setDataSource}
            onDisplayConfigChange={setDisplayConfig}
          />
```

- [ ] **Step 2: Update data source form props and imports**

At the top of `src/main/frontend/src/widget/WidgetDataSourceForm.tsx`, add imports:

```ts
import {
  extractSelectableFields,
  selectedFieldsFromConfig,
  withSelectedFields
} from "./displayConfig";
import { WidgetFieldSelector } from "./WidgetFieldSelector";
```

Change the props type to:

```ts
type WidgetDataSourceFormProps = {
  dashboardId: string;
  widget: Widget;
  displayConfig?: Record<string, unknown> | null;
  onChange?: (dataSource: DataSource) => void;
  onDisplayConfigChange?: (displayConfig: Record<string, unknown> | null) => void;
};
```

Change the function signature to:

```ts
export function WidgetDataSourceForm({
  dashboardId,
  widget,
  displayConfig,
  onChange,
  onDisplayConfigChange
}: WidgetDataSourceFormProps) {
```

- [ ] **Step 3: Track selectable response fields**

Inside `WidgetDataSourceForm`, after the existing `fetchResult` state:

```ts
  const selectedDisplayFields = selectedFieldsFromConfig(displayConfig ?? widget.displayConfig);
  const selectableFields = fetchResult && fetchResult.ok === true
    ? extractSelectableFields(fetchResult.data)
    : [];
  const supportsFieldSelection = widget.type === "table" || widget.type === "json_preview";
```

Add this handler near `toggleColumn`:

```ts
  function updateDisplayFields(fields: string[]) {
    onDisplayConfigChange?.(withSelectedFields(displayConfig ?? widget.displayConfig, fields));
  }
```

- [ ] **Step 4: Render selector after Test Fetch result**

After:

```tsx
      {fetchResult ? <WidgetFetchResult result={fetchResult} /> : null}
```

add:

```tsx
      {supportsFieldSelection ? (
        <WidgetFieldSelector
          fields={selectableFields}
          selectedFields={selectedDisplayFields}
          onChange={updateDisplayFields}
        />
      ) : null}
```

- [ ] **Step 5: Fix fetch result typing**

`fetchWidgetData` returns `WidgetFetchResult` (`{ ok: true, data } | { ok: false, status }`), so replace:

```ts
interface WidgetFetchResultData {
  fetchError?: boolean;
  status?: number;
  body?: string;
  [key: string]: unknown;
}
```

with:

```ts
type WidgetFetchResultData =
  | { ok: true; data: unknown }
  | { ok: false; status: number }
  | { fetchError: true; status: number; body: string };
```

Keep the catch block as:

```ts
      setFetchResult({ fetchError: true, status: 0, body: String(err) });
```

The existing `WidgetFetchResult` component accepts `Record<string, unknown>`, so if TypeScript complains, update its prop to `result: unknown` and render with type guards. The smallest acceptable update is:

```tsx
type WidgetFetchResultProps = {
  result: unknown;
};
```

and keep `JSON.stringify(result, null, 2)` for the non-error branch after checking `isFetchError(result)`.

- [ ] **Step 6: Run frontend build**

Run:

```powershell
cd src/main/frontend
npm.cmd run build
```

Expected: PASS. If it fails because `WidgetFetchResult` uses object properties on `unknown`, add:

```ts
function isFetchError(result: unknown): result is { fetchError: true; status?: number; body?: string } {
  return typeof result === "object" && result !== null && "fetchError" in result;
}
```

and replace `result.fetchError === true` with `isFetchError(result)`.

- [ ] **Step 7: Commit**

```powershell
git add src/main/frontend/src/widget/WidgetEditPanel.tsx src/main/frontend/src/widget/WidgetDataSourceForm.tsx src/main/frontend/src/widget/WidgetFetchResult.tsx
git commit -m "feat: choose widget display fields from test fetch"
```

---

### Task 5: Add Editor Integration Test

**Files:**
- Modify: `src/main/frontend/src/widget/__tests__/DashboardEditor.test.tsx`

- [ ] **Step 1: Add JSON Preview fixture**

Add near the existing widget fixtures:

```ts
const jsonPreviewWidget = {
  id: "widget-3",
  title: "Users",
  type: "json_preview",
  x: 0,
  y: 2,
  w: 3,
  h: 2,
  displayConfig: null,
  dataSource: {
    type: "rest",
    url: "https://api.example.test/users",
    method: "GET",
    headers: {},
    body: null
  }
};
```

- [ ] **Step 2: Add failing save test**

Append this test to the existing `describe("DashboardEditor", () => { ... })` block:

```tsx
  it("saves selected display fields from a tested JSON Preview data source", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([jsonPreviewWidget]));
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // listTables
    fetchMock.mockResolvedValueOnce(jsonResponse({
      ok: true,
      data: [
        { id: 1, name: "Alice", email: "alice@example.test" },
        { id: 2, name: "Grace", email: "grace@example.test" }
      ]
    }));
    fetchMock.mockResolvedValueOnce(jsonResponse({
      ...jsonPreviewWidget,
      displayConfig: { selectedFields: ["name", "email"] }
    }));

    renderEditor();

    const card = (await screen.findByRole("heading", { name: "Users" })).closest("article");
    expect(card).not.toBeNull();
    await user.click(card!);

    const panel = screen.getByRole("dialog", { name: /edit widget/i });
    await user.click(within(panel).getByRole("button", { name: /test fetch/i }));

    await user.click(await within(panel).findByRole("checkbox", { name: "name" }));
    await user.click(within(panel).getByRole("checkbox", { name: "email" }));
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
          displayConfigJson: JSON.stringify({ selectedFields: ["name", "email"] }),
          dataSourceJson: JSON.stringify(jsonPreviewWidget.dataSource)
        })
      })
    );
  });
```

- [ ] **Step 3: Run editor test to verify it fails, then passes after Task 4**

Run:

```powershell
cd src/main/frontend
npm.cmd run test:run -- src/widget/__tests__/DashboardEditor.test.tsx
```

Expected before Task 4: FAIL because no display-field checkboxes appear.

Expected after Task 4: PASS.

- [ ] **Step 4: Add a table-specific integration test if Task 4 changed table data-source columns**

Only add this if the implementation accidentally conflates table data-source `columns` with display `selectedFields`. This test protects that distinction:

```tsx
  it("keeps table data-source columns separate from selected display fields", async () => {
    const tableWidget = {
      ...jsonPreviewWidget,
      id: "widget-4",
      title: "Accounts",
      type: "table",
      dataSource: {
        type: "table",
        table: "accounts",
        columns: ["id", "name", "email"],
        limit: null
      }
    };

    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([tableWidget]));
    fetchMock.mockResolvedValueOnce(jsonResponse(["accounts"])); // listTables
    fetchMock.mockResolvedValueOnce(jsonResponse(["id", "name", "email"])); // listColumns
    fetchMock.mockResolvedValueOnce(jsonResponse({
      ok: true,
      data: [{ id: 1, name: "Alice", email: "alice@example.test" }]
    }));
    fetchMock.mockResolvedValueOnce(jsonResponse({
      ...tableWidget,
      displayConfig: { selectedFields: ["name"] }
    }));

    renderEditor();

    const card = (await screen.findByRole("heading", { name: "Accounts" })).closest("article");
    expect(card).not.toBeNull();
    await user.click(card!);

    const panel = screen.getByRole("dialog", { name: /edit widget/i });
    await user.click(within(panel).getByRole("button", { name: /test fetch/i }));
    await user.click(await within(panel).findByRole("checkbox", { name: "name" }));
    await user.click(within(panel).getByRole("button", { name: /save/i }));

    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/dashboards/dashboard-1/widgets/widget-4?dashboardVersion=4",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          title: "Accounts",
          type: "table",
          x: 0,
          y: 2,
          w: 3,
          h: 2,
          displayConfigJson: JSON.stringify({ selectedFields: ["name"] }),
          dataSourceJson: JSON.stringify(tableWidget.dataSource)
        })
      })
    );
  });
```

- [ ] **Step 5: Commit**

```powershell
git add src/main/frontend/src/widget/__tests__/DashboardEditor.test.tsx
git commit -m "test: cover widget display field selection"
```

---

### Task 6: Full Verification

**Files:**
- No code changes unless verification exposes a defect.

- [ ] **Step 1: Run focused frontend tests**

Run:

```powershell
cd src/main/frontend
npm.cmd run test:run -- src/widget/__tests__/displayConfig.test.ts src/widget/__tests__/WidgetRenderer.test.tsx src/widget/__tests__/DashboardEditor.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full frontend test suite**

Run:

```powershell
cd src/main/frontend
npm.cmd run test:run
```

Expected: PASS.

- [ ] **Step 3: Run frontend build**

Run:

```powershell
cd src/main/frontend
npm.cmd run build
```

Expected: PASS.

- [ ] **Step 4: Manual smoke test**

Run frontend dev server:

```powershell
cd src/main/frontend
npm.cmd run dev
```

Run backend in another terminal:

```powershell
.\mvnw.cmd spring-boot:run
```

Manual expected flow:

1. Open a dashboard at `http://localhost:5173`.
2. Edit a JSON Preview widget with a REST API data source.
3. Click `Test Fetch`.
4. Confirm response top-level fields appear as checkboxes under `Display fields`.
5. Select two fields.
6. Save.
7. Open viewer, run search/refresh, and confirm JSON Preview contains only selected fields.
8. Repeat with a Table widget and confirm the table renders only selected display fields.

- [ ] **Step 5: Final commit**

If Task 6 required fixes:

```powershell
git add src/main/frontend/src/widget
git commit -m "fix: stabilize widget field selection"
```

If no fixes were needed, no commit is required.

---

## Self-Review

**Spec coverage:** The plan covers Table and JSON Preview, derives choices from data-source response after Test Fetch, supports selecting multiple fields, persists selections in `displayConfigJson`, and filters rendered output.

**Placeholder scan:** No placeholders remain; every implementation step names exact files, commands, and expected results.

**Type consistency:** The plan consistently uses `selectedFields: string[]`, `displayConfig`, `WidgetFetchResult`, `extractSelectableFields`, `filterDataToFields`, and `WidgetFieldSelector`.

**Risk notes:** This plan intentionally avoids backend schema changes. It also avoids nested-path selection; if nested JSON field selection is later required, add a separate plan for path notation such as `user.profile.name`.
