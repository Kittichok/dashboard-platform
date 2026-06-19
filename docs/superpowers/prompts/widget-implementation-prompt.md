Implement only the Widget slice from:
`dashboard-platform/docs/superpowers/specs/2026-06-15-dashboard-library-vertical-slice-design.md`

Execution rules:
- Keep token usage low (haiku4.5 budget)
- One step at a time
- Read only the listed files per step — no repo scanning
- List files to touch (3 max) before editing
- Run only the smallest relevant verification
- Finish with: files changed / what implemented / verification result / blocker

---

## Scope

**New files — backend:**
- `src/main/java/com/dashboardplatform/widget/Widget.java`
- `src/main/java/com/dashboardplatform/widget/WidgetRepository.java`
- `src/main/java/com/dashboardplatform/widget/WidgetService.java`
- `src/main/java/com/dashboardplatform/widget/WidgetController.java`
- `src/main/java/com/dashboardplatform/widget/WidgetRequests.java`
- `src/main/java/com/dashboardplatform/widget/WidgetExceptions.java`

**New files — frontend:**
- `src/main/frontend/src/widget/types.ts`
- `src/main/frontend/src/widget/widgetApi.ts`
- `src/main/frontend/src/widget/DashboardEditor.tsx`
- `src/main/frontend/src/widget/WidgetAddDialog.tsx`
- `src/main/frontend/src/widget/WidgetEditPanel.tsx`
- `src/main/frontend/src/widget/WidgetDataSourceForm.tsx`
- `src/main/frontend/src/widget/WidgetRenderer.tsx`
- `src/main/frontend/src/widget/WidgetFetchResult.tsx`

---

## Steps

### Step 1 — Widget domain record
Only inspect:
- `src/main/java/com/dashboardplatform/dashboard/Dashboard.java`

`Widget.java` fields:
```java
UUID id; String title; String type; // table|chart|metric|text
int x; int y; int w; int h;
String displayConfigJson; // nullable
String dataSourceJson;    // nullable, see schema below
```
Data source JSON shape: `{ "type":"rest", "url":"...", "method":"GET|POST", "headers":{}, "body":null }`

No DB table — widgets live inside `dashboards.widgets_json`.

---

### Step 2 — Widget repository (read/write widgets_json)
Only inspect:
- `src/main/java/com/dashboardplatform/dashboard/Dashboard.java`
- `src/main/java/com/dashboardplatform/dashboard/JdbcDashboardRepository.java`
- `src/main/java/com/dashboardplatform/widget/Widget.java`

`WidgetRepository` interface:
```java
List<Widget> findAll(UUID dashboardId);
void save(UUID dashboardId, long expectedDashboardVersion, List<Widget> widgets); // full replace + version bump
boolean dashboardExists(UUID dashboardId);
```
`save` uses a single UPDATE constrained by `id = ? AND version = ?`; returns false on 0 rows updated.

---

### Step 3 — Widget service rules
Only inspect:
- `src/main/java/com/dashboardplatform/widget/WidgetRepository.java`
- `src/main/java/com/dashboardplatform/widget/Widget.java`
- `src/main/java/com/dashboardplatform/dashboard/DashboardExceptions.java`

Rules:
- `addWidget`: generate UUID id, validate title (1–120 chars), type (enum), w/h ≥ 1; append to list; call `save`
- `updateWidget`: validate same fields; replace in list; call `save`
- `reorderWidgets`: validate all IDs present; replace order; call `save`
- `removeWidget`: find by id or throw `WidgetNotFoundException`; call `save`
- `fetchWidgetData`: load widget, validate `dataSource` present; make outbound HTTP GET/POST; return raw body or `WidgetFetchException`
- All mutations: stale version → `DashboardVersionConflictException`; missing dashboard → `DashboardNotFoundException`

`WidgetExceptions`:
- `WidgetNotFoundException`
- `WidgetValidationException(Map<String,String> fieldErrors)`
- `WidgetFetchException(int httpStatus, String body)` — not a 500

---

### Step 4 — Widget controller
Only inspect:
- `src/main/java/com/dashboardplatform/widget/WidgetService.java`
- `src/main/java/com/dashboardplatform/web/ApiExceptionHandler.java`

Routes (all under `/api/dashboards/{dashboardId}/widgets`):
```
GET    /                                  → 200 List<WidgetResponse>
POST   /?dashboardVersion={v}             → 201 + Location
PATCH  /{widgetId}?dashboardVersion={v}   → 200 WidgetResponse
PUT    /order?dashboardVersion={v}        → 200 List<WidgetResponse>
DELETE /{widgetId}?dashboardVersion={v}   → 204
POST   /{widgetId}/fetch                  → 200 raw JSON or WidgetFetchError
```

`WidgetRequests`:
```java
record AddWidgetRequest(
    @NotBlank @Size(max=120) String title,
    @NotNull WidgetType type,
    @Min(0) int x, @Min(0) int y,
    @Min(1) int w, @Min(1) int h,
    String displayConfigJson,
    String dataSourceJson) {}

record UpdateWidgetRequest(/* same fields as Add */) {}

record ReorderWidgetsRequest(List<@NotNull UUID> orderedIds) {}
```

Add `WidgetNotFoundException` and `WidgetFetchException` mappings to `ApiExceptionHandler`:
- `WidgetNotFoundException` → 404
- `WidgetFetchException` → 200 with body `{ "fetchError": true, "status": N, "body": "..." }`

---

### Step 5 — Frontend types and API client
Only inspect:
- `src/main/frontend/src/dashboard/types.ts`
- `src/main/frontend/src/dashboard/dashboardApi.ts`

`src/main/frontend/src/widget/types.ts`:
```typescript
export type WidgetType = 'table' | 'chart' | 'metric' | 'text';

export interface DataSource {
  type: 'rest';
  url: string;
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body: string | null;
}

export interface Widget {
  id: string; title: string; type: WidgetType;
  x: number; y: number; w: number; h: number;
  displayConfig: Record<string, unknown> | null;
  dataSource: DataSource | null;
}

export interface WidgetInput {
  title: string; type: WidgetType;
  x: number; y: number; w: number; h: number;
  displayConfig?: Record<string, unknown>;
  dataSource?: DataSource;
}
```

`widgetApi.ts` operations:
```typescript
listWidgets(dashboardId, dashboardVersion): Promise<Widget[]>
addWidget(dashboardId, dashboardVersion, input): Promise<Widget>
updateWidget(dashboardId, widgetId, dashboardVersion, input): Promise<Widget>
reorderWidgets(dashboardId, dashboardVersion, orderedIds): Promise<Widget[]>
removeWidget(dashboardId, widgetId, dashboardVersion): Promise<void>
fetchWidgetData(dashboardId, widgetId): Promise<unknown>
```

---

### Step 6 — DashboardEditor component
Only inspect:
- `src/main/frontend/src/widget/widgetApi.ts`
- `src/main/frontend/src/widget/types.ts`
- `src/main/frontend/src/App.tsx`

`DashboardEditor.tsx`:
- Mounts at `/dashboards/:id`
- Fetches dashboard detail + widget list on mount
- Renders widgets in grid using CSS grid (position via inline style)
- Toolbar: back-to-library button, dashboard name, "Add Widget" button
- Clicking a widget opens `WidgetEditPanel`
- Delete button per widget (with confirmation)
- Stale `409` shows inline conflict notice; unexpected errors show dismissible banner

---

### Step 7 — WidgetAddDialog + WidgetEditPanel + WidgetDataSourceForm
Only inspect:
- `src/main/frontend/src/widget/types.ts`
- `src/main/frontend/src/dashboard/DashboardDialog.tsx`

`WidgetAddDialog.tsx`: type picker + title + x/y/w/h fields; submits `addWidget`

`WidgetEditPanel.tsx`: slide-in panel; title, type, position fields; includes `WidgetDataSourceForm`

`WidgetDataSourceForm.tsx`: URL, method select, headers key-value pairs, body textarea; "Test Fetch" button that calls `fetchWidgetData` and passes result to `WidgetFetchResult`

`WidgetFetchResult.tsx`: renders raw JSON in `<pre>` or `{ fetchError: true }` as red error box

---

### Step 8 — WidgetRenderer
Only inspect:
- `src/main/frontend/src/widget/types.ts`

`WidgetRenderer.tsx` dispatches by `widget.type`:
- `table` → render `displayConfig.columns` headers + placeholder rows
- `chart` → render SVG line placeholder labelled with title
- `metric` → render `displayConfig.value` or `"—"` in large text
- `text` → render `displayConfig.content` as markdown (use `<pre>` if no markdown lib)

---

## Verification

Backend (run after Step 4):
```bash
cd /Users/2521107876/Desktop/poc/dashboard-platform
./mvnw -Dtest=WidgetServiceTest,WidgetControllerTest test
```

Frontend (run after Step 8):
```bash
cd src/main/frontend
npm run test:run
```

Full build smoke (run last):
```bash
./mvnw package
java -jar target/dashboard-platform-*.jar
curl http://localhost:8080/api/dashboards
```

---

Start with:
**Implement Widget Step [N] only.**
