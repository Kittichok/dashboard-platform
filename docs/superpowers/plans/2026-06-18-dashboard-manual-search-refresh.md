# Dashboard Manual Search Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dashboard viewing obey the domain rule that opening a dashboard never requests widget data automatically; visitors explicitly run widget requests with Search or Refresh.

**Architecture:** Keep the existing widget fetch API and dashboard/widget storage unchanged. Move viewer request orchestration into a small frontend helper that runs configured widget requests concurrently, deduplicates identical data-source requests within one operation, and reports each widget result as it finishes so widget cards can update independently.

**Tech Stack:** React 19, TypeScript 5, Vite 8, Vitest 4, React Testing Library, existing `fetchWidgetData` frontend API helper

---

## File Structure

- Create `src/main/frontend/src/widget/widgetRequestRunner.ts`: orchestrates one Search or Refresh operation for all widgets on a dashboard.
- Create `src/main/frontend/src/widget/__tests__/widgetRequestRunner.test.ts`: unit tests concurrent execution, dedupe, skipped widgets, and per-widget callbacks.
- Create `src/main/frontend/src/widget/__tests__/DashboardViewer.test.tsx`: component tests that opening a dashboard does not fetch widget data, Search fetches data, Refresh reruns after Search, and failures clear previous visible data.
- Modify `src/main/frontend/src/widget/DashboardViewer.tsx`: remove auto-fetch effect, add Search/Refresh controls, track per-widget loading and results, call `runWidgetRequests`.
- Modify `src/main/frontend/src/styles.css`: add small viewer control/status styles only if existing button and notice classes are not enough.

## Product Rules Covered

- Opening a dashboard never requests widget data automatically.
- The visitor must click **Search** before widget requests run.
- **Refresh** reruns all widget requests using the last searched values. Because dashboard variables do not exist yet, "last searched values" is currently the empty variable set.
- Search and refresh run widget requests concurrently.
- Identical resolved widget requests are sent once and shared within a single search or refresh.
- A failed request affects only its widget and clears its previous result.

## Out Of Scope

- Dashboard variables, URL variable values, and remembered values in local storage.
- Backend proxy timeout/size enforcement.
- Data Source Library and reusable REST API Sources.
- Table filtering, table sorting, or pagination.

## Task 1: Add Widget Request Runner Tests

**Files:**
- Create: `src/main/frontend/src/widget/__tests__/widgetRequestRunner.test.ts`
- Create later: `src/main/frontend/src/widget/widgetRequestRunner.ts`

- [ ] **Step 1: Write the failing unit tests**

Create `src/main/frontend/src/widget/__tests__/widgetRequestRunner.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";

import { runWidgetRequests } from "../widgetRequestRunner";
import type { Widget, WidgetFetchResult } from "../types";

function widget(overrides: Partial<Widget>): Widget {
  return {
    id: "widget-1",
    title: "Widget",
    type: "table",
    x: 0,
    y: 0,
    w: 3,
    h: 2,
    displayConfig: null,
    dataSource: null,
    ...overrides
  };
}

function ok(data: unknown): WidgetFetchResult {
  return { ok: true, data };
}

describe("runWidgetRequests", () => {
  it("fetches configured widgets concurrently and reports each result by widget id", async () => {
    const fetchWidgetData = vi.fn()
      .mockResolvedValueOnce(ok([{ service: "api", status: "up" }]))
      .mockResolvedValueOnce(ok({ value: 42 }));
    const onWidgetResult = vi.fn();

    const tableWidget = widget({
      id: "widget-1",
      dataSource: {
        type: "rest",
        url: "https://api.example.test/services",
        method: "GET",
        headers: {},
        body: null
      }
    });
    const metricWidget = widget({
      id: "widget-2",
      type: "metric",
      dataSource: {
        type: "rest",
        url: "https://api.example.test/health",
        method: "GET",
        headers: {},
        body: null
      }
    });

    const results = await runWidgetRequests({
      dashboardId: "dashboard-1",
      widgets: [tableWidget, metricWidget],
      fetchWidgetData,
      onWidgetResult
    });

    expect(fetchWidgetData).toHaveBeenCalledTimes(2);
    expect(fetchWidgetData).toHaveBeenCalledWith("dashboard-1", "widget-1", tableWidget.dataSource);
    expect(fetchWidgetData).toHaveBeenCalledWith("dashboard-1", "widget-2", metricWidget.dataSource);
    expect(results).toEqual({
      "widget-1": ok([{ service: "api", status: "up" }]),
      "widget-2": ok({ value: 42 })
    });
    expect(onWidgetResult).toHaveBeenCalledWith("widget-1", ok([{ service: "api", status: "up" }]));
    expect(onWidgetResult).toHaveBeenCalledWith("widget-2", ok({ value: 42 }));
  });

  it("skips widgets without data sources", async () => {
    const fetchWidgetData = vi.fn();

    const results = await runWidgetRequests({
      dashboardId: "dashboard-1",
      widgets: [widget({ id: "widget-1", dataSource: null })],
      fetchWidgetData
    });

    expect(fetchWidgetData).not.toHaveBeenCalled();
    expect(results).toEqual({});
  });

  it("deduplicates identical data sources within one operation and shares the response", async () => {
    const sharedSource = {
      type: "rest" as const,
      url: "https://api.example.test/summary",
      method: "GET" as const,
      headers: { Accept: "application/json" },
      body: null
    };
    const result = ok({ total: 12 });
    const fetchWidgetData = vi.fn().mockResolvedValueOnce(result);

    const results = await runWidgetRequests({
      dashboardId: "dashboard-1",
      widgets: [
        widget({ id: "widget-1", dataSource: sharedSource }),
        widget({ id: "widget-2", type: "text", dataSource: sharedSource })
      ],
      fetchWidgetData
    });

    expect(fetchWidgetData).toHaveBeenCalledTimes(1);
    expect(fetchWidgetData).toHaveBeenCalledWith("dashboard-1", "widget-1", sharedSource);
    expect(results).toEqual({
      "widget-1": result,
      "widget-2": result
    });
  });

  it("treats header insertion order as the same resolved request", async () => {
    const firstSource = {
      type: "rest" as const,
      url: "https://api.example.test/summary",
      method: "GET" as const,
      headers: { Accept: "application/json", "X-Team": "ops" },
      body: null
    };
    const secondSource = {
      type: "rest" as const,
      url: "https://api.example.test/summary",
      method: "GET" as const,
      headers: { "X-Team": "ops", Accept: "application/json" },
      body: null
    };
    const fetchWidgetData = vi.fn().mockResolvedValueOnce(ok({ total: 12 }));

    await runWidgetRequests({
      dashboardId: "dashboard-1",
      widgets: [
        widget({ id: "widget-1", dataSource: firstSource }),
        widget({ id: "widget-2", dataSource: secondSource })
      ],
      fetchWidgetData
    });

    expect(fetchWidgetData).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```powershell
Set-Location src/main/frontend
npm.cmd run test:run -- src/widget/__tests__/widgetRequestRunner.test.ts
```

Expected: `FAIL` because `../widgetRequestRunner` does not exist.

- [ ] **Step 3: Commit the failing tests**

```powershell
git add src/main/frontend/src/widget/__tests__/widgetRequestRunner.test.ts
git commit -m "test: cover widget request runner behavior"
```

## Task 2: Implement Widget Request Runner

**Files:**
- Create: `src/main/frontend/src/widget/widgetRequestRunner.ts`
- Test: `src/main/frontend/src/widget/__tests__/widgetRequestRunner.test.ts`

- [ ] **Step 1: Add the request runner implementation**

Create `src/main/frontend/src/widget/widgetRequestRunner.ts`:

```typescript
import { fetchWidgetData as defaultFetchWidgetData } from "./widgetApi";
import type { DataSource, Widget, WidgetFetchResult } from "./types";

type FetchWidgetData = (
  dashboardId: string,
  widgetId: string,
  dataSource?: DataSource
) => Promise<WidgetFetchResult>;

type RunWidgetRequestsInput = {
  dashboardId: string;
  widgets: Widget[];
  fetchWidgetData?: FetchWidgetData;
  onWidgetResult?: (widgetId: string, result: WidgetFetchResult) => void;
};

export async function runWidgetRequests({
  dashboardId,
  widgets,
  fetchWidgetData = defaultFetchWidgetData,
  onWidgetResult
}: RunWidgetRequestsInput): Promise<Record<string, WidgetFetchResult>> {
  const results: Record<string, WidgetFetchResult> = {};
  const groups = new Map<string, Widget[]>();

  for (const widget of widgets) {
    if (!widget.dataSource) {
      continue;
    }
    const key = stableStringify(widget.dataSource);
    groups.set(key, [...(groups.get(key) ?? []), widget]);
  }

  await Promise.all(
    Array.from(groups.values()).map(async (group) => {
      const representative = group[0];
      const result = await fetchWidgetData(
        dashboardId,
        representative.id,
        representative.dataSource ?? undefined
      );
      for (const widget of group) {
        results[widget.id] = result;
        onWidgetResult?.(widget.id, result);
      }
    })
  );

  return results;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(",")}}`;
}
```

- [ ] **Step 2: Run the request runner tests**

Run:

```powershell
Set-Location src/main/frontend
npm.cmd run test:run -- src/widget/__tests__/widgetRequestRunner.test.ts
```

Expected: `PASS`.

- [ ] **Step 3: Commit the helper**

```powershell
git add src/main/frontend/src/widget/widgetRequestRunner.ts src/main/frontend/src/widget/__tests__/widgetRequestRunner.test.ts
git commit -m "feat: add widget request runner"
```

## Task 3: Add Dashboard Viewer Behavior Tests

**Files:**
- Create: `src/main/frontend/src/widget/__tests__/DashboardViewer.test.tsx`
- Modify later: `src/main/frontend/src/widget/DashboardViewer.tsx`

- [ ] **Step 1: Write the failing viewer tests**

Create `src/main/frontend/src/widget/__tests__/DashboardViewer.test.tsx`:

```typescript
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardViewer } from "../DashboardViewer";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });
}

function renderViewer() {
  render(
    <MemoryRouter initialEntries={["/dashboards/dashboard-1/view"]}>
      <Routes>
        <Route path="/dashboards/:id/view" element={<DashboardViewer />} />
      </Routes>
    </MemoryRouter>
  );
}

const dashboard = {
  id: "dashboard-1",
  name: "Service Operations",
  description: "Latency dashboard",
  widgets: [],
  version: 4
};

const latencyWidget = {
  id: "widget-1",
  title: "Latency",
  type: "metric",
  x: 0,
  y: 0,
  w: 3,
  h: 2,
  displayConfig: { value: "98.4" },
  dataSource: {
    type: "rest",
    url: "https://api.example.test/latency",
    method: "GET",
    headers: {},
    body: null
  }
};

const summaryWidget = {
  id: "widget-2",
  title: "Summary",
  type: "text",
  x: 3,
  y: 0,
  w: 3,
  h: 2,
  displayConfig: { content: "Waiting" },
  dataSource: {
    type: "rest",
    url: "https://api.example.test/summary",
    method: "GET",
    headers: {},
    body: null
  }
};

describe("DashboardViewer search and refresh", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("loads the dashboard and widgets without requesting widget data", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([latencyWidget]));

    renderViewer();

    expect(await screen.findByRole("heading", { name: "Latency" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/dashboards/dashboard-1/widgets/widget-1/fetch",
      expect.anything()
    );
    expect(screen.getByText("98.4")).toBeInTheDocument();
  });

  it("runs widget requests only after Search is clicked", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([latencyWidget]));
    fetchMock.mockResolvedValueOnce(jsonResponse({ value: "123.0" }));

    renderViewer();

    await screen.findByRole("heading", { name: "Latency" });
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/dashboards/dashboard-1/widgets/widget-1/fetch",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(latencyWidget.dataSource)
      })
    );
    expect(await screen.findByText("123.0")).toBeInTheDocument();
  });

  it("enables Refresh after Search and reruns the last searched request set", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([latencyWidget]));
    fetchMock.mockResolvedValueOnce(jsonResponse({ value: "123.0" }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ value: "124.5" }));

    renderViewer();

    await screen.findByRole("heading", { name: "Latency" });
    const refresh = screen.getByRole("button", { name: "Refresh" });
    expect(refresh).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByText("123.0")).toBeInTheDocument();
    expect(refresh).toBeEnabled();

    await user.click(refresh);
    expect(await screen.findByText("124.5")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("clears a widget's previous result when its refresh fails", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([latencyWidget]));
    fetchMock.mockResolvedValueOnce(jsonResponse({ value: "123.0" }));
    fetchMock.mockResolvedValueOnce(new Response("Bad gateway", { status: 502 }));

    renderViewer();

    await screen.findByRole("heading", { name: "Latency" });
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByText("123.0")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(screen.queryByText("123.0")).not.toBeInTheDocument();
    });
    expect(screen.getByText("HTTP 502 — No data")).toBeInTheDocument();
  });

  it("updates widgets independently as each concurrent request completes", async () => {
    const user = userEvent.setup();
    let resolveLatency: (response: Response) => void = () => undefined;
    let resolveSummary: (response: Response) => void = () => undefined;
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([latencyWidget, summaryWidget]));
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => {
      resolveLatency = resolve;
    }));
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => {
      resolveSummary = resolve;
    }));

    renderViewer();

    await screen.findByRole("heading", { name: "Latency" });
    await user.click(screen.getByRole("button", { name: "Search" }));

    resolveSummary(jsonResponse("summary ready"));
    expect(await screen.findByText("summary ready")).toBeInTheDocument();
    expect(screen.getByText("98.4")).toBeInTheDocument();

    resolveLatency(jsonResponse({ value: "123.0" }));
    const latencyCard = screen.getByRole("heading", { name: "Latency" }).closest("article");
    expect(latencyCard).not.toBeNull();
    expect(await within(latencyCard!).findByText("123.0")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the viewer tests and verify they fail**

Run:

```powershell
Set-Location src/main/frontend
npm.cmd run test:run -- src/widget/__tests__/DashboardViewer.test.tsx
```

Expected: `FAIL`; the first test fails because `DashboardViewer` currently auto-fetches widget data on load, and the Search/Refresh buttons do not exist.

- [ ] **Step 3: Commit the failing viewer tests**

```powershell
git add src/main/frontend/src/widget/__tests__/DashboardViewer.test.tsx
git commit -m "test: cover manual dashboard search"
```

## Task 4: Wire Manual Search And Refresh In DashboardViewer

**Files:**
- Modify: `src/main/frontend/src/widget/DashboardViewer.tsx`
- Test: `src/main/frontend/src/widget/__tests__/DashboardViewer.test.tsx`

- [ ] **Step 1: Update imports and state**

In `src/main/frontend/src/widget/DashboardViewer.tsx`, replace the `fetchWidgetData` import with `runWidgetRequests`:

```typescript
import { listWidgets } from "./widgetApi";
import { runWidgetRequests } from "./widgetRequestRunner";
```

Replace the widget data/loading state block:

```typescript
const [widgetData, setWidgetData] = useState<Record<string, WidgetFetchResult>>({});
const [widgetLoading, setWidgetLoading] = useState<Record<string, boolean>>({});
const [dataLoading, setDataLoading] = useState(false);
const [hasSearched, setHasSearched] = useState(false);
```

- [ ] **Step 2: Remove the automatic fetch effect**

Delete this effect from `DashboardViewer.tsx`:

```typescript
useEffect(() => {
  if (!id || widgets.length === 0) return;
  let cancelled = false;
  setDataLoading(true);
  (async () => {
    const results: Record<string, WidgetFetchResult> = {};
    await Promise.all(widgets.map(async (w) => {
      if (!w.dataSource) return;
      results[w.id] = await fetchWidgetData(id, w.id);
    }));
    if (!cancelled) {
      setWidgetData(results);
      setDataLoading(false);
    }
  })();
  return () => { cancelled = true; };
}, [id, widgets]);
```

- [ ] **Step 3: Add the request operation handler**

Add this function below the existing `load` effect:

```typescript
const runRequests = useCallback(async () => {
  if (!id) {
    return;
  }

  const requestableWidgetIds = widgets
    .filter((widget) => widget.dataSource)
    .map((widget) => widget.id);
  const loadingState = Object.fromEntries(
    requestableWidgetIds.map((widgetId) => [widgetId, true])
  ) as Record<string, boolean>;

  setHasSearched(true);
  setDataLoading(requestableWidgetIds.length > 0);
  setWidgetLoading(loadingState);
  setWidgetData({});

  try {
    await runWidgetRequests({
      dashboardId: id,
      widgets,
      onWidgetResult: (widgetId, result) => {
        setWidgetData((current) => ({
          ...current,
          [widgetId]: result
        }));
        setWidgetLoading((current) => ({
          ...current,
          [widgetId]: false
        }));
      }
    });
  } finally {
    setDataLoading(false);
    setWidgetLoading({});
  }
}, [id, widgets]);
```

- [ ] **Step 4: Add Search and Refresh controls**

In the page header action area, replace the single Edit Dashboard link:

```tsx
<div className="header-actions">
  <button
    type="button"
    className="button primary"
    onClick={runRequests}
    disabled={dataLoading || widgets.length === 0}
  >
    <Icon name="search" /> Search
  </button>
  <button
    type="button"
    className="button secondary"
    onClick={runRequests}
    disabled={dataLoading || !hasSearched || widgets.length === 0}
  >
    <Icon name="refresh" /> Refresh
  </button>
  <Link to={`/dashboards/${id}`} className="button secondary" style={{ textDecoration: "none" }}>
    <Icon name="edit" /> Edit Dashboard
  </Link>
</div>
```

If `Icon` does not support `search` and `refresh`, add those names in `src/main/frontend/src/dashboard/icons.tsx` using the existing icon pattern. Use simple stroke icons consistent with the file's current SVG style.

- [ ] **Step 5: Add per-widget loading status to cards**

Inside each widget card, above `WidgetRenderer`, add:

```tsx
{widgetLoading[widget.id] ? (
  <div className="widget-status" role="status">Loading...</div>
) : null}
```

Keep passing the current data to `WidgetRenderer`:

```tsx
<WidgetRenderer widget={widget} fetchData={widgetData[widget.id]} />
```

- [ ] **Step 6: Run the viewer tests**

Run:

```powershell
Set-Location src/main/frontend
npm.cmd run test:run -- src/widget/__tests__/DashboardViewer.test.tsx
```

Expected: `PASS`.

- [ ] **Step 7: Commit the viewer wiring**

```powershell
git add src/main/frontend/src/widget/DashboardViewer.tsx src/main/frontend/src/dashboard/icons.tsx src/main/frontend/src/widget/__tests__/DashboardViewer.test.tsx
git commit -m "feat: require manual dashboard search"
```

## Task 5: Add Minimal Styles And Full Frontend Verification

**Files:**
- Modify: `src/main/frontend/src/styles.css`
- Test: all frontend tests

- [ ] **Step 1: Add styles only if missing**

If `.header-actions` and `.widget-status` do not already exist in `src/main/frontend/src/styles.css`, add:

```css
.header-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.widget-status {
  color: var(--muted);
  font-size: 12px;
  margin-bottom: 8px;
}
```

- [ ] **Step 2: Run the full frontend test suite**

Run:

```powershell
Set-Location src/main/frontend
npm.cmd run test:run
```

Expected: `PASS`.

- [ ] **Step 3: Run the frontend build**

Run:

```powershell
Set-Location src/main/frontend
npm.cmd run build
```

Expected: `PASS`; TypeScript compiles and Vite produces `dist/`.

- [ ] **Step 4: Commit styles and verification fixes**

```powershell
git add src/main/frontend/src/styles.css
git commit -m "style: polish dashboard search controls"
```

If `styles.css` did not need changes, skip this commit.

## Task 6: Final Verification

**Files:**
- No code changes expected.

- [ ] **Step 1: Run backend tests to catch accidental full-app regressions**

Run:

```powershell
Set-Location D:\AI\dashboard-platform
.\mvnw.cmd test
```

Expected: `PASS`.

- [ ] **Step 2: Run frontend tests again from a clean shell location**

Run:

```powershell
Set-Location D:\AI\dashboard-platform\src\main\frontend
npm.cmd run test:run
```

Expected: `PASS`.

- [ ] **Step 3: Run package build with frontend skipped**

Run:

```powershell
Set-Location D:\AI\dashboard-platform
.\mvnw.cmd package -DskipFrontend
```

Expected: `PASS`; backend package succeeds without rebuilding frontend assets.

## Self-Review Notes

- Spec coverage: This plan covers the `CONTEXT.md` viewer rules for no auto-fetch, explicit Search, Refresh after Search, concurrent widget requests, per-widget failure state, and single-operation dedupe. It intentionally does not cover dashboard variables or URL state because the project has no variable model yet.
- Placeholder scan: No placeholder markers, unspecified validation, or copy-by-reference steps remain.
- Type consistency: The plan uses existing `Widget`, `DataSource`, `WidgetFetchResult`, `fetchWidgetData`, and `DashboardViewer` names. The new helper accepts an injectable `fetchWidgetData` only for focused unit testing.
