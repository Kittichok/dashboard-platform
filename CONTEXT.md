# Dashboard Platform

This context defines the shared language for a product that lets people assemble data-driven dashboards from configurable parts.

## Language

**Dashboard Platform**:
A product in which people create and manage multiple customizable dashboards composed of independently configured widgets.
_Avoid_: Dashboard website, fixed reporting site

**Workspace**:
The shared collection of dashboards and data sources that every visitor can view and modify without identifying themselves.
_Avoid_: Organization, account, tenant

**Dashboard**:
A workspace-owned collection of widgets arranged to present related data, identified by an immutable generated ID independent of its editable name.
_Avoid_: Report, page

**Dashboard Library**:
The searchable workspace list from which visitors create, open, rename, duplicate, and delete dashboards.
_Avoid_: Dashboard folder, catalog

**Widget**:
An independently positioned and sized part of a dashboard that presents data through one visualization and its display settings.
_Avoid_: Component, panel, tile

**Edit Mode**:
A dashboard state in which a visitor may add, configure, duplicate, delete, reposition, and resize widgets.
_Avoid_: Builder, designer

**Dashboard Draft**:
The complete set of unsaved dashboard and widget changes made during edit mode. Saving replaces the current dashboard with the draft, while cancelling discards it.
_Avoid_: Autosave, pending changes

**Table Widget**:
A widget that presents records from a selected JSON array as rows, with columns selected relative to each array item.
_Avoid_: Grid

**Text Widget**:
A widget that presents multiple selected string or number values from an API response, each with an optional label.
_Avoid_: Static text, Markdown, note

**Raw JSON Widget**:
A debugging widget that presents the exact full JSON response in formatted text.
_Avoid_: JSON preview

**JSON Preview Widget**:
A widget that presents JSON as an interactive collapsible tree with searchable keys and values.
_Avoid_: Raw JSON viewer

**Field Selection**:
A value chosen from a visual JSON response tree and retained by its JSONPath-like location for use in a widget.
_Avoid_: Column mapping, manual path

**Test Request**:
A temporary widget request made in the editor using supplied variable values so its JSON response can be inspected and fields selected. The response is not retained as part of the dashboard.
_Avoid_: Preview data, saved sample

**Refresh**:
A rerun of all widget requests using the last searched variable values without changing dashboard inputs or URL state.
_Avoid_: Search

**Connection Test**:
A temporary `GET` or `POST` request with an unsaved relative path, headers, query values, and body, used to verify a REST API source's base URL, authentication, and credentials.
_Avoid_: Test request

**Dashboard Variable**:
A named dashboard input whose value is supplied by a visitor and reused by one or more widgets when requesting data. A required variable is shown on the dashboard and must have a value before its dependent widgets can load.
_Avoid_: Parameter, filter

**Variables Panel**:
The edit-mode area where visitors add, rename, reorder, duplicate, and delete dashboard variables; configure their type, label, required status, and default value; and inspect which widgets reference them.
_Avoid_: Filter builder, parameter settings

**Variable Type**:
The kind of value accepted by a dashboard variable: text, number, or date.
_Avoid_: Input type, parameter type

**Data Source**:
A reusable workspace resource through which widgets obtain data from one external system.
_Avoid_: Connection, integration

**Data Source Library**:
The workspace list from which visitors create, inspect, edit, and delete reusable data sources.
_Avoid_: Connection manager

**REST API Source**:
A data source that defines a reusable API base URL and shared authentication for widget requests that return JSON.
_Avoid_: HTTP connector, API connection

**Widget Request**:
The endpoint, method, and request values through which a widget retrieves data from its REST API source.
_Avoid_: Query, API call

**Variable Token**:
A `{{variableName}}` reference that inserts a dashboard variable into a widget request path, query value, header value, or JSON body value. A token must name an existing dashboard variable before the widget can be saved.
_Avoid_: Placeholder, template parameter

**Source Credential**:
A secret used by a REST API source to authenticate through a bearer token or an API key in a configured request header.
_Avoid_: Password, auth value

**Request Route**:
The path through the dashboard server used to call a REST API source on behalf of a widget.
_Avoid_: Direct mode, browser request

**Visitor**:
An unidentified person using the workspace with the same access as every other visitor.
_Avoid_: User, member, administrator

## Rules

- The workspace is available only within the organization's trusted private network.
- Every visitor can view and modify all dashboards and data sources.
- Each widget obtains data from exactly one data source.
- Version 1 supports only REST API sources returning JSON.
- REST API sources support `GET` and `POST` requests.
- `POST` requests are used only to retrieve data; widgets do not create, update, or delete data in external systems.
- Current dashboard variable values are represented in the dashboard URL so the same view can be refreshed or shared.
- A visitor may edit dashboard variables without requesting data. Clicking **Search** commits the current values to the URL and refreshes dependent widgets.
- Search is disabled while any required dashboard variable is empty, and each missing required variable is highlighted.
- A REST API source may use no authentication, a bearer token, or an API key in a configurable header. OAuth is not supported in version 1.
- Every visitor may reveal and replace the original credential stored for a REST API source.
- Source credentials are stored as plaintext in the platform database.
- Every REST API request is sent through the dashboard server; visitors' browsers never call data-source APIs directly.
- Version 1 includes table, text, raw JSON, and JSON preview widgets.
- Table cells display an em dash for missing or null values and compact JSON text for object or array values.
- A table may filter its loaded rows by searching across displayed columns. Version 1 does not provide table sorting or pagination.
- Each widget request has a 30-second timeout and accepts a response of at most 5 MB.
- A failed request affects only its widget, which clears its previous result and displays the HTTP status or timeout with a short error message.
- Dashboards use a responsive grid. Layout and widget changes are available only in edit mode; normal viewing cannot alter the dashboard.
- Dashboard saves use optimistic version checking. A stale draft is rejected and must be reloaded; it never overwrites a newer saved dashboard.
- Visitors may create, rename, duplicate, delete, and search dashboards in the dashboard library. Deletion requires confirmation; version 1 has no folders, tags, or archive.
- Duplicating a dashboard copies its widgets, layout, variable definitions, defaults, and references to existing data sources. It does not copy current URL values or create duplicate data sources.
- A data source referenced by any widget cannot be deleted. Its dependent dashboards and widgets must be shown so visitors can remove or reassign those references first.
- A dashboard variable referenced by any widget cannot be deleted. Its dependent widgets must be shown so visitors can remove those references first.
- Renaming a dashboard variable atomically updates every variable token that references it when the dashboard draft is saved.
- Changing a dashboard variable's type clears an incompatible default value and requires the visitor to review the affected widgets before saving the dashboard draft.
- Visitors may create, edit, test, duplicate, delete, and search data sources in the data source library. Deletion remains subject to reference checks.
- A variable token occupying an entire JSON body value preserves its variable type. A token embedded within other text is inserted as a string.
- When an API response contains no usable JSON, the widget displays its HTTP status with an empty response state and does not display the raw response body.
- For valid empty JSON (`[]`, `{}`, or `null`), table and text widgets show **No data**, while raw JSON and JSON preview widgets preserve and display the exact value.
- Opening a dashboard never requests widget data automatically. The visitor must click **Search**, including when variable values are already available.
- The last searched variable values are remembered per dashboard in the visitor's browser. Values present in the dashboard URL take priority over remembered values.
- Clicking **Search** writes every non-empty dashboard variable value to the URL and omits empty optional variables.
- Version 1 supports manual refresh only and has no timed automatic refresh.
- Search and refresh run widget requests concurrently. Each widget owns its loading state and renders independently as soon as its request completes.
- Identical resolved widget requests are sent once and share their response within a single search or refresh. Responses are not cached across separate operations.
- Version 1 POST requests support only JSON bodies and use `Content-Type: application/json`.
- A widget request cannot define a header with the same case-insensitive name as its source authentication header; the widget must be corrected before it can be saved.
- API-key authentication is supported only through a configurable request header, never through a query parameter.
- The dashboard server proxy may call any destination reachable from its network, with no hostname or address restrictions.
