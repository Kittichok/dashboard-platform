# Create Guide — Dashboard, Widget & Data Source

## Overview

| Resource | Scope | Persistence | API Root |
|----------|-------|-------------|----------|
| **Data Source** | Workspace | `data_sources` table (own row) | `/api/data-sources` |
| **Dashboard** | Workspace | `dashboards` table (own row) | `/api/dashboards` |
| **Widget** | Dashboard | Embedded JSON array in `dashboards.widgets_json` | `/api/dashboards/{id}/widgets` |

A **Data Source** is a reusable workspace resource (base URL + auth). A **Dashboard** is an independent collection of **Widgets**. Each **Widget** optionally references a **Data Source** by ID and defines a request path, method, headers, and body.

---

## 1. Data Source (workspace-level)

### Backend record

`DataSource.java` — stored in `data_sources` table:

| Field | Type | Notes |
|-------|------|-------|
| `id` | `UUID` | Generated |
| `name` | `String` | Max 120 chars |
| `type` | `String` | Currently always `"rest"` |
| `configJson` | `String` | JSON — shape defined by frontend `RestApiSourceConfig` |
| `version` | `long` | Optimistic locking |
| `createdAt` | `Instant` | |
| `updatedAt` | `Instant` | |

### Frontend type (`data-source/types.ts`)

```typescript
interface DataSource {
  id: string;
  name: string;
  type: "rest";
  config: RestApiSourceConfig;
  version: number;
}

interface RestApiSourceConfig {
  baseUrl: string;
  authentication: AuthenticationConfig;
}

type AuthenticationConfig =
  | { type: "none" }
  | { type: "bearer_token"; value: string }
  | { type: "api_key_header"; headerName: string; value: string };
```

### Wire format (`DataSourceResponse`)

```json
{
  "id": "uuid",
  "name": "My API",
  "type": "rest",
  "config": {
    "baseUrl": "https://api.example.com",
    "authentication": { "type": "bearer_token", "value": "tok_..." }
  },
  "version": 1,
  "createdAt": "2026-06-20T10:00:00Z",
  "updatedAt": "2026-06-20T10:00:00Z"
}
```

### API

| Method | Path | Body | Response |
|--------|------|------|----------|
| `GET` | `/api/data-sources` | — | `DataSourceResponse[]` |
| `POST` | `/api/data-sources` | `{ name, type, config }` | `201` + `DataSourceResponse` |
| `PATCH` | `/api/data-sources/{id}` | `{ name, type, config, version }` | `DataSourceResponse` |
| `DELETE` | `/api/data-sources/{id}?version=` | — | `204` |
| `POST` | `/api/data-sources/import` | `{ name, type, config }` | `201` |
| `GET` | `/api/data-sources/{id}/export` | — | `{ name, type, config }` |

### Create flow

```
POST /api/data-sources
{ "name": "My API", "type": "rest",
  "config": { "baseUrl": "https://api.example.com",
    "authentication": { "type": "bearer_token", "value": "tok_abc" } } }
```
→ `201` with `DataSourceResponse` containing the generated `id` and `version: 1`.

---

## 2. Dashboard

### Backend record

`Dashboard.java` — stored in `dashboards` table:

| Field | Type | Notes |
|-------|------|-------|
| `id` | `UUID` | Generated |
| `name` | `String` | Max 120 chars |
| `description` | `String` | Max 500 chars |
| `widgetsJson` | `String` | JSON array of widget objects |
| `variableStateJson` | `String` | JSON map of variable key → value |
| `version` | `long` | Optimistic locking |
| `createdAt` | `Instant` | |
| `updatedAt` | `Instant` | |

### Frontend type (`dashboard/types.ts`)

```typescript
type Dashboard = {
  id: string;
  name: string;
  description: string;
  widgets: Array<Record<string, unknown>>;
  variableState?: Record<string, string>;
  version: number;
};

type DashboardInput = {
  name: string;
  description: string;
};
```

### API

| Method | Path | Body | Response |
|--------|------|------|----------|
| `GET` | `/api/dashboards` | — | `DashboardResponse[]` |
| `GET` | `/api/dashboards/{id}` | — | `DashboardResponse` |
| `POST` | `/api/dashboards` | `{ name, description }` | `201` |
| `PATCH` | `/api/dashboards/{id}` | `{ name, description, version }` | `DashboardResponse` |
| `PATCH` | `/api/dashboards/{id}/variable-state` | `{ version, variableState }` | `DashboardResponse` |
| `POST` | `/api/dashboards/{id}/duplicate` | — | `201` |
| `DELETE` | `/api/dashboards/{id}?version=` | — | `204` |
| `POST` | `/api/dashboards/import` | `{ name, description, widgets, variableState }` | `201` |
| `GET` | `/api/dashboards/{id}/export` | — | dashboard JSON |

### Widget field within dashboard response

`DashboardResponse` parses `widgetsJson` into `List<Map<String, Object>>`. Each map contains:

```json
{
  "id": "uuid",
  "title": "My Widget",
  "type": "table",
  "x": 0, "y": 0, "w": 6, "h": 4,
  "displayConfig": { ... },
  "dataSource": { ... }
}
```

### Create flow

```
POST /api/dashboards
{ "name": "Sales Dashboard", "description": "Q2 numbers" }
```
→ `201` with `DashboardResponse` containing `widgets: []`, `version: 1`.

---

## 3. Widget

### Backend record

`Widget.java` — not a database table; stored as JSON inside `dashboards.widgets_json`.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `UUID` | Generated |
| `title` | `String` | Max 120 chars |
| `type` | `WidgetType` | Enum: `table`, `chart`, `metric`, `text`, `raw_json`, `json_preview` |
| `x` | `int` | Grid column (0-indexed) |
| `y` | `int` | Grid row (0-indexed) |
| `w` | `int` | Width in columns (1-12) |
| `h` | `int` | Height in rows |
| `displayConfigJson` | `String` | Free-form JSON — depends on widget type |
| `dataSourceJson` | `String` | JSON — see data source shapes below |

### Frontend types (`widget/types.ts`)

```typescript
type WidgetType = 'table' | 'chart' | 'metric' | 'text' | 'raw_json' | 'json_preview';

type Widget = {
  id: string;
  title: string;
  type: WidgetType;
  x: number; y: number; w: number; h: number;
  displayConfig: Record<string, unknown> | null;
  dataSource: DataSource | null;
};

type WidgetInput = {
  title: string;
  type: WidgetType;
  x: number; y: number; w: number; h: number;
  displayConfig?: Record<string, unknown> | null;
  dataSource?: DataSource | null;
};
```

### Data source shapes (widget-level `dataSource` field)

A widget's data source is a **discriminated union**:

```typescript
type DataSource =
  | SelectedRestDataSource   // references a workspace DataSource by ID
  | LegacyRestDataSource      // inline URL (no shared DataSource)
  | TableDataSource;          // direct DB table query

// Preferred: reference existing workspace DataSource
interface SelectedRestDataSource {
  kind: "rest";
  dataSourceId: string;
  request: { path: string; method: "GET" | "POST";
             headers: Record<string, string>; body: string | null };
  responseBindings?: ResponseBinding[];
}

// Inline — no shared DataSource
interface LegacyRestDataSource {
  type: "rest";
  url: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
  body: string | null;
  responseBindings?: ResponseBinding[];
}

interface ResponseBinding {
  variable: string;
  jsonPath: string;
}

// Database table query
interface TableDataSource {
  type: "table";
  table: string;
  columns: string[];
  limit: number | null;
}
```

### API

| Method | Path | Query Params | Body | Response |
|--------|------|-------------|------|----------|
| `GET` | `.../widgets` | — | — | `WidgetResponse[]` |
| `POST` | `.../widgets` | `dashboardVersion` | `AddWidgetRequest` | `201` |
| `PATCH` | `.../widgets/{widgetId}` | `dashboardVersion` | `UpdateWidgetRequest` | `WidgetResponse` |
| `DELETE` | `.../widgets/{widgetId}` | `dashboardVersion` | — | `204` |
| `PUT` | `.../widgets/order` | `dashboardVersion` | `{ orderedIds: string[] }` | `WidgetResponse[]` |
| `POST` | `.../widgets/import` | `dashboardVersion` | `ImportWidgetRequest` | `201` |
| `GET` | `.../widgets/{widgetId}/export` | — | — | widget JSON |
| `POST` | `.../widgets/{widgetId}/fetch` | — | optional DataSource override | response body text |

> `dashboardVersion` is always required for mutations.

### Widget request bodies (wire format)

`AddWidgetRequest` / `UpdateWidgetRequest`:

```json
{
  "title": "Revenue Table",
  "type": "table",
  "x": 0, "y": 0, "w": 6, "h": 4,
  "displayConfigJson": "{\"selectedFields\":[\"$.revenue\",\"$.date\"]}",
  "dataSourceJson": "{\"kind\":\"rest\",\"dataSourceId\":\"<uuid>\",\"request\":{\"path\":\"/v1/sales\",\"method\":\"GET\",\"headers\":{},\"body\":null},\"responseBindings\":[{\"variable\":\"auth_token\",\"jsonPath\":\"access_token\"}]}"
}
```

`ImportWidgetRequest` (takes parsed objects, not JSON strings):

```json
{
  "title": "Revenue Table", "type": "table",
  "x": 0, "y": 0, "w": 6, "h": 4,
  "displayConfig": { "selectedFields": ["$.revenue", "$.date"] },
  "dataSource": { "kind": "rest", "dataSourceId": "<uuid>",
    "request": { "path": "/v1/sales", "method": "GET", "headers": {}, "body": null },
    "responseBindings": [{ "variable": "auth_token", "jsonPath": "access_token" }] }
}
```

### Display config per widget type

The `displayConfig` shape is type-dependent and free-form. Common patterns:

| Widget Type | Typical `displayConfig` fields |
|-------------|-------------------------------|
| `table` | `selectedFields`, `columns` (column label/width) |
| `chart` | chart-specific settings |
| `metric` | field selection, label, formatting |
| `text` | field selection, labels |
| `raw_json` | (none — displays full response) |
| `json_preview` | (none — interactive tree) |

### Create flow

```
POST /api/dashboards/{dashboardId}/widgets?dashboardVersion=1
{ "title": "Revenue", "type": "table", "x": 0, "y": 0, "w": 6, "h": 4,
  "displayConfigJson": null,
  "dataSourceJson": "{\"kind\":\"rest\",\"dataSourceId\":\"<ds-id>\",\"request\":{\"path\":\"/revenue\",\"method\":\"GET\",\"headers\":{},\"body\":null}}" }
```
→ `201` with `WidgetResponse`. The dashboard's `version` is bumped by the service. On version conflict (`WHERE version = ?` returns 0 rows), the request is rejected.

---

## 4. Key Architectural Notes

- **Optimistic locking**: Every dashboard/data source mutation requires the current `version`. If another edit was saved first, `version` no longer matches and the request fails with a version conflict error.
- **Widgets are embedded**: Widgets live inside `dashboards.widgets_json`. Adding/updating/removing a widget rewrites the entire JSON array for the dashboard. There is no separate `widgets` table.
- **Data fetching proxied**: The browser never calls external APIs directly. It posts to `POST .../widgets/{id}/fetch` and the server proxies the request.
- **References**: A Data Source referenced by any widget (`dataSourceId` in `SelectedRestDataSource`) cannot be deleted until all references are removed. The `DELETE /api/data-sources/{id}` endpoint checks references and returns them in the error body.
- **Variable tokens**: `{{variableName}}` in widget request paths, headers, and bodies is resolved client-side by `widgetRequestRunner.ts` at search/refresh time.
- **Response bindings**: REST data sources may define `responseBindings` to capture values from one widget response (for example `access_token`) into runtime variables (for example `auth_token`) used by later dependent widgets in the same search/refresh run.
- **Grid**: 12-column CSS grid with 16px gap. Widgets are positioned by `(x, y)` and sized by `(w, h)`.

---

## 5. End-to-End Example

```
1. CREATE DATA SOURCE
   POST /api/data-sources
   → { "id": "ds-1", "version": 1, ... }

2. CREATE DASHBOARD
   POST /api/dashboards
   → { "id": "db-1", "version": 1, "widgets": [], ... }

3. ADD WIDGET (references data source)
   POST /api/dashboards/db-1/widgets?dashboardVersion=1
   { "title": "Sales", "type": "table", "x": 0, "y": 0, "w": 12, "h": 6,
     "dataSourceJson": "{\"kind\":\"rest\",\"dataSourceId\":\"ds-1\",
       \"request\":{\"path\":\"/sales\",\"method\":\"GET\",\"headers\":{},\"body\":null}}" }
   → dashboard version bumped to 2

4. FETCH WIDGET DATA (server-proxied)
   POST /api/dashboards/db-1/widgets/{widgetId}/fetch
   → response body (raw JSON from external API)
```
