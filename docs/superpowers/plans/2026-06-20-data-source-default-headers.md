# Data Source Default Headers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable default headers to shared REST API Sources, seed new sources with `Content-Type: application/json`, and provide a static HTML preview of the updated UI.

**Architecture:** Extend the existing JSON-backed data source config with a `headers` map while keeping authentication structured. Update backend validation and fetch header composition, then teach the frontend dialog and library views to edit, display, import, and export those headers. Ship a standalone HTML mock artifact for visual review without creating a second live UI path.

**Tech Stack:** Spring Boot 3.5.7, Java 21, Jackson, SQLite JSON text storage, React 19, TypeScript 5, Vite 8, Vitest 4, React Testing Library.

---

## File Structure

- Modify: `src/main/java/com/dashboardplatform/datasource/DataSourceService.java`
- Modify: `src/main/java/com/dashboardplatform/widget/WidgetService.java`
- Modify: `src/test/java/com/dashboardplatform/datasource/DataSourceServiceTest.java`
- Modify: `src/main/frontend/src/data-source/types.ts`
- Modify: `src/main/frontend/src/data-source/DataSourceDialog.tsx`
- Modify: `src/main/frontend/src/data-source/DataSourceLibrary.tsx`
- Modify: `src/main/frontend/src/data-source/__tests__/dataSourceApi.test.ts`
- Modify: `src/main/frontend/src/data-source/__tests__/DataSourceLibrary.test.tsx`
- Create: `docs/ui-data-source-default-headers-preview.html`

## Contract Decisions

- REST data source config becomes:

```json
{
  "baseUrl": "https://api.example.test",
  "authentication": {
    "type": "api_key_header",
    "headerName": "X-API-Key",
    "value": "secret"
  },
  "headers": {
    "Content-Type": "application/json",
    "Accept": "application/json"
  }
}
```

- Missing `headers` in stored/imported configs is treated as `{}`.
- New frontend-created REST API Sources start with:

```json
{
  "headers": {
    "Content-Type": "application/json"
  }
}
```

- Validation rules:
  - header names are required
  - header values are required
  - duplicate header names are invalid when compared case-insensitively
  - default headers may not reuse the authentication header name
- Fetch merge order:
  - authentication header
  - data source default headers
  - widget request headers
- Widget request headers may override ordinary default headers, but may not override the authentication header.

## Task 1: Add Backend Header Validation And Export Support

**Files:**
- Modify: `src/main/java/com/dashboardplatform/datasource/DataSourceService.java`
- Modify: `src/test/java/com/dashboardplatform/datasource/DataSourceServiceTest.java`

- [ ] **Step 1: Write the failing validation tests first**

```java
@Test
void create_data_source_rejects_duplicate_headers_case_insensitively() {
    var config = restConfig(
        "https://api.example.test",
        Map.of("type", "none"),
        new LinkedHashMap<>(Map.of(
            "Content-Type", "application/json",
            "content-type", "application/problem+json")));

    var ex = assertThrows(
        DataSourceValidationException.class,
        () -> service.createDataSource("Orders API", "rest", config));

    assertEquals("Header names must be unique.", ex.fieldErrors().get("config.headers"));
}
```

```java
@Test
void export_data_source_includes_headers() {
    var created = service.createDataSource(
        "Orders API",
        "rest",
        restConfig(
            "https://api.example.test",
            Map.of("type", "none"),
            Map.of("Content-Type", "application/json", "Accept", "application/json")));

    assertEquals(
        Map.of("Content-Type", "application/json", "Accept", "application/json"),
        ((Map<?, ?>) service.exportDataSource(created.id()).get("config")).get("headers"));
}
```

- [ ] **Step 2: Run the focused backend test to verify it fails**

Run: `.\mvnw.cmd test -Dtest=DataSourceServiceTest`
Expected: FAIL with missing `headers` validation or mismatched exported config

- [ ] **Step 3: Implement config normalization and validation in `DataSourceService`**

```java
private void validateRestConfig(Map<String, Object> config, Map<String, String> errors) {
    var baseUrl = stringValue(config.get("baseUrl"));
    // existing baseUrl validation

    var authentication = requireAuthentication(config, errors);
    var reservedHeaderName = validateAuthentication(authentication, errors);
    validateHeaders(config.get("headers"), reservedHeaderName, errors);
}
```

```java
private void validateHeaders(Object headersNode, String reservedHeaderName, Map<String, String> errors) {
    if (headersNode == null) {
        return;
    }
    if (!(headersNode instanceof Map<?, ?> rawHeaders)) {
        errors.put("config.headers", "Headers must be an object.");
        return;
    }

    var seen = new LinkedHashSet<String>();
    for (var entry : rawHeaders.entrySet()) {
        var name = stringValue(entry.getKey());
        var value = stringValue(entry.getValue());
        if (name == null || name.isBlank()) {
            errors.put("config.headers", "Header names are required.");
            return;
        }
        if (value == null || value.isBlank()) {
            errors.put("config.headers", "Header values are required.");
            return;
        }
        var normalized = name.toLowerCase(Locale.ROOT);
        if (!seen.add(normalized)) {
            errors.put("config.headers", "Header names must be unique.");
            return;
        }
        if (reservedHeaderName != null && normalized.equals(reservedHeaderName.toLowerCase(Locale.ROOT))) {
            errors.put("config.headers", "Default headers cannot override the authentication header.");
            return;
        }
    }
}
```

```java
private Map<String, Object> normalizedConfig(Map<String, Object> config) {
    var normalized = new LinkedHashMap<String, Object>(config);
    normalized.putIfAbsent("headers", Map.of());
    return normalized;
}
```

- [ ] **Step 4: Ensure create and update store normalized config**

```java
var normalizedConfig = normalizedConfig(config);
var errors = validate(name, type, normalizedConfig);
// ...
writeConfig(normalizedConfig)
```

- [ ] **Step 5: Re-run the focused backend test**

Run: `.\mvnw.cmd test -Dtest=DataSourceServiceTest`
Expected: `BUILD SUCCESS`

- [ ] **Step 6: Commit**

```bash
git add src/main/java/com/dashboardplatform/datasource/DataSourceService.java src/test/java/com/dashboardplatform/datasource/DataSourceServiceTest.java
git commit -m "feat(datasource): support default headers in config"
```

## Task 2: Add Backend Fetch Header Merge Rules

**Files:**
- Modify: `src/main/java/com/dashboardplatform/widget/WidgetService.java`
- Modify: `src/test/java/com/dashboardplatform/datasource/DataSourceServiceTest.java`

- [ ] **Step 1: Write the failing coverage for header merge behavior**

```java
@Test
void fetch_widget_allows_request_headers_to_override_default_headers_but_not_authentication_header() {
    // create source with auth header X-API-Key and default headers Content-Type + Accept
    // issue widget fetch with request headers Accept + X-API-Key
    // expect WidgetFetchException with authentication header conflict message
}
```

```java
@Test
void fetch_widget_merges_default_headers_before_widget_headers() {
    // create source with default header Accept=application/json
    // widget request sets Accept=text/csv
    // assert outbound request uses text/csv and still keeps Content-Type default
}
```

- [ ] **Step 2: Run focused tests to verify failure**

Run: `.\mvnw.cmd test -Dtest=DataSourceServiceTest`
Expected: FAIL because fetch composition ignores or mishandles default headers

- [ ] **Step 3: Update `WidgetService` to load headers from data source config**

```java
record RestSourceConfig(
    String baseUrl,
    Authentication authentication,
    Map<String, String> headers
) {
}
```

```java
var mergedHeaders = new LinkedHashMap<String, String>();
applyAuthenticationHeader(config.authentication(), mergedHeaders);
mergeDefaultHeaders(config.headers(), mergedHeaders, config.authentication());
mergeWidgetHeaders(request.headers(), mergedHeaders, config.authentication());
```

```java
private void mergeWidgetHeaders(
    Map<String, String> requestHeaders,
    Map<String, String> mergedHeaders,
    Authentication authentication
) {
    for (var entry : requestHeaders.entrySet()) {
        if (authentication.headerName() != null
            && authentication.headerName().equalsIgnoreCase(entry.getKey())) {
            throw new WidgetFetchException(400, "Widget request header conflicts with data source authentication header.");
        }
        mergedHeaders.put(entry.getKey(), entry.getValue());
    }
}
```

- [ ] **Step 4: Re-run the focused backend test**

Run: `.\mvnw.cmd test -Dtest=DataSourceServiceTest`
Expected: `BUILD SUCCESS`

- [ ] **Step 5: Commit**

```bash
git add src/main/java/com/dashboardplatform/widget/WidgetService.java src/test/java/com/dashboardplatform/datasource/DataSourceServiceTest.java
git commit -m "feat(widget): merge default headers from data sources"
```

## Task 3: Extend Frontend Types And API Coverage

**Files:**
- Modify: `src/main/frontend/src/data-source/types.ts`
- Modify: `src/main/frontend/src/data-source/__tests__/dataSourceApi.test.ts`

- [ ] **Step 1: Add the failing API serialization test first**

```ts
it("creates a data source with default headers in config", async () => {
  fetchMock.mockResolvedValueOnce(jsonResponse({
    id: "source-1",
    name: "Orders API",
    type: "rest",
    config: {
      baseUrl: "https://api.example.test",
      authentication: { type: "none" },
      headers: { "Content-Type": "application/json" }
    },
    version: 1
  }, { status: 201 }));

  await createDataSource({
    name: "Orders API",
    type: "rest",
    config: {
      baseUrl: "https://api.example.test",
      authentication: { type: "none" },
      headers: { "Content-Type": "application/json" }
    }
  });

  expect(fetchMock).toHaveBeenCalledWith("/api/data-sources", expect.objectContaining({
    body: JSON.stringify({
      name: "Orders API",
      type: "rest",
      config: {
        baseUrl: "https://api.example.test",
        authentication: { type: "none" },
        headers: { "Content-Type": "application/json" }
      }
    })
  }));
});
```

- [ ] **Step 2: Run the focused frontend API test**

Run: `npm.cmd run test:run -- src/data-source/__tests__/dataSourceApi.test.ts`
Expected: FAIL with type mismatch or missing `headers`

- [ ] **Step 3: Extend the TypeScript config type**

```ts
export interface RestApiSourceConfig {
  baseUrl: string;
  authentication: AuthenticationConfig;
  headers: Record<string, string>;
}
```

- [ ] **Step 4: Re-run the focused frontend API test**

Run: `npm.cmd run test:run -- src/data-source/__tests__/dataSourceApi.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/frontend/src/data-source/types.ts src/main/frontend/src/data-source/__tests__/dataSourceApi.test.ts
git commit -m "test(frontend): cover data source header config"
```

## Task 4: Build The Default Headers Editor In The Data Source Dialog

**Files:**
- Modify: `src/main/frontend/src/data-source/DataSourceDialog.tsx`
- Modify: `src/main/frontend/src/data-source/__tests__/DataSourceLibrary.test.tsx`

- [ ] **Step 1: Write the failing dialog interaction test first**

```ts
it("seeds Content-Type for new data sources and lets the user edit header rows", async () => {
  const user = userEvent.setup();
  fetchMock
    .mockResolvedValueOnce(jsonResponse([]))
    .mockResolvedValueOnce(jsonResponse({
      id: "source-1",
      name: "Orders API",
      type: "rest",
      config: {
        baseUrl: "https://api.example.test/orders",
        authentication: { type: "none" },
        headers: {
          "Content-Type": "application/ld+json",
          Accept: "application/json"
        }
      },
      version: 1
    }, { status: 201 }));

  renderLibrary();
  await screen.findByText(/no data sources yet/i);
  await user.click(screen.getByRole("button", { name: /new data source/i }));
  const dialog = screen.getByRole("dialog", { name: /create data source/i });

  expect(within(dialog).getByDisplayValue("Content-Type")).toBeInTheDocument();
  expect(within(dialog).getByDisplayValue("application/json")).toBeInTheDocument();

  await user.type(within(dialog).getByRole("textbox", { name: /name/i }), "Orders API");
  await user.type(within(dialog).getByRole("textbox", { name: /base url/i }), "https://api.example.test/orders");
  await user.clear(within(dialog).getByDisplayValue("application/json"));
  await user.type(within(dialog).getByDisplayValue(""), "application/ld+json");
  await user.click(within(dialog).getByRole("button", { name: /add header/i }));
  // fill Accept row, submit, then assert POST body includes both headers
});
```

- [ ] **Step 2: Run the focused UI test**

Run: `npm.cmd run test:run -- src/data-source/__tests__/DataSourceLibrary.test.tsx`
Expected: FAIL because the dialog has no header editor yet

- [ ] **Step 3: Add local header-row state and default seeding to `DataSourceDialog.tsx`**

```tsx
type HeaderRow = { id: string; name: string; value: string };

const [headerRows, setHeaderRows] = useState<HeaderRow[]>(() => {
  if (dataSource) {
    return toHeaderRows(dataSource.config.headers);
  }
  return [{ id: crypto.randomUUID(), name: "Content-Type", value: "application/json" }];
});
```

```tsx
function buildHeaders(rows: HeaderRow[]) {
  return Object.fromEntries(
    rows
      .map((row) => [row.name.trim(), row.value.trim()] as const)
      .filter(([name, value]) => name.length > 0 || value.length > 0)
  );
}
```

- [ ] **Step 4: Render the header editor controls**

```tsx
<fieldset className="dialog-fieldset">
  <legend>Default Headers</legend>
  {headerRows.map((row, index) => (
    <div key={row.id} className="header-row">
      <input
        aria-label={`Header name ${index + 1}`}
        value={row.name}
        onChange={(event) => updateHeaderRow(row.id, "name", event.target.value)}
        placeholder="Content-Type"
      />
      <input
        aria-label={`Header value ${index + 1}`}
        value={row.value}
        onChange={(event) => updateHeaderRow(row.id, "value", event.target.value)}
        placeholder="application/json"
      />
      <button type="button" className="button secondary" onClick={() => removeHeaderRow(row.id)}>
        Remove
      </button>
    </div>
  ))}
  <button type="button" className="button secondary" onClick={addHeaderRow}>Add Header</button>
  {fieldErrors["config.headers"] ? <small className="field-error">{fieldErrors["config.headers"]}</small> : null}
</fieldset>
```

- [ ] **Step 5: Submit the new config shape**

```tsx
await onSubmit({
  name,
  type: "rest",
  config: {
    baseUrl,
    authentication,
    headers: buildHeaders(headerRows)
  },
  version: dataSource?.version
});
```

- [ ] **Step 6: Re-run the focused UI test**

Run: `npm.cmd run test:run -- src/data-source/__tests__/DataSourceLibrary.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/main/frontend/src/data-source/DataSourceDialog.tsx src/main/frontend/src/data-source/__tests__/DataSourceLibrary.test.tsx
git commit -m "feat(frontend): edit default headers on data sources"
```

## Task 5: Show Header Summaries In The Library And Cover Import Compatibility

**Files:**
- Modify: `src/main/frontend/src/data-source/DataSourceLibrary.tsx`
- Modify: `src/main/frontend/src/data-source/__tests__/DataSourceLibrary.test.tsx`

- [ ] **Step 1: Add the failing library rendering test first**

```ts
it("renders header summaries and tolerates imported configs without headers", async () => {
  fetchMock.mockResolvedValueOnce(jsonResponse([
    {
      id: "source-1",
      name: "Orders API",
      type: "rest",
      config: {
        baseUrl: "https://api.example.test/orders",
        authentication: { type: "none" },
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Tenant": "ops"
        }
      },
      version: 1
    }
  ]));

  renderLibrary();

  expect(await screen.findByText(/Content-Type: application\/json/i)).toBeInTheDocument();
  expect(screen.getByText(/\+1 more/i)).toBeInTheDocument();
});
```

```ts
it("imports a config file without headers and still succeeds", async () => {
  // upload file with only baseUrl + authentication
  // expect import request body to stay accepted and resulting card to render
});
```

- [ ] **Step 2: Run the focused library test**

Run: `npm.cmd run test:run -- src/data-source/__tests__/DataSourceLibrary.test.tsx`
Expected: FAIL because no header summary is rendered yet

- [ ] **Step 3: Render compact header summaries in `DataSourceLibrary.tsx`**

```tsx
const headerEntries = Object.entries(dataSource.config.headers ?? {});
const visibleHeaders = headerEntries.slice(0, 2);
const hiddenHeaderCount = Math.max(0, headerEntries.length - visibleHeaders.length);
```

```tsx
{visibleHeaders.length > 0 ? (
  <div className="card-meta">
    {visibleHeaders.map(([name, value]) => (
      <span key={name}>{name}: {value}</span>
    ))}
    {hiddenHeaderCount > 0 ? <span>+{hiddenHeaderCount} more</span> : null}
  </div>
) : null}
```

- [ ] **Step 4: Ensure list rendering tolerates older data without `headers`**

```tsx
function headerEntriesFor(dataSource: DataSource) {
  return Object.entries(dataSource.config.headers ?? {});
}
```

- [ ] **Step 5: Re-run the focused library test**

Run: `npm.cmd run test:run -- src/data-source/__tests__/DataSourceLibrary.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/main/frontend/src/data-source/DataSourceLibrary.tsx src/main/frontend/src/data-source/__tests__/DataSourceLibrary.test.tsx
git commit -m "feat(frontend): show data source header summaries"
```

## Task 6: Add Static HTML Preview Artifact

**Files:**
- Create: `docs/ui-data-source-default-headers-preview.html`

- [ ] **Step 1: Create the standalone HTML preview file**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Data Source Default Headers Preview</title>
</head>
<body>
  <main>
    <section>
      <h1>Data Source Library Preview</h1>
      <p>Static mock for default headers support.</p>
    </section>
    <section>
      <article>
        <h2>Orders API</h2>
        <p>https://api.example.test/orders</p>
        <p>Content-Type: application/json</p>
        <p>Accept: application/json</p>
        <p>+1 more</p>
      </article>
    </section>
    <section>
      <h2>Create Data Source</h2>
      <label>Name <input value="Orders API"></label>
      <label>Base URL <input value="https://api.example.test/orders"></label>
      <label>Authentication <select><option>No authentication</option></select></label>
      <div>
        <h3>Default Headers</h3>
        <label>Header Name <input value="Content-Type"></label>
        <label>Header Value <input value="application/json"></label>
      </div>
      <pre><code>{
  "name": "Orders API",
  "type": "rest",
  "config": {
    "baseUrl": "https://api.example.test/orders",
    "authentication": { "type": "none" },
    "headers": {
      "Content-Type": "application/json"
    }
  }
}</code></pre>
    </section>
  </main>
</body>
</html>
```

- [ ] **Step 2: Open the file locally and verify it shows the requested states**

Run: `Get-Content docs\ui-data-source-default-headers-preview.html`
Expected: file contains dialog mock, card summary, and JSON example with `Content-Type`

- [ ] **Step 3: Commit**

```bash
git add docs/ui-data-source-default-headers-preview.html
git commit -m "docs: add data source default headers preview"
```

## Task 7: Final Verification

**Files:**
- No additional files required unless verification reveals a needed doc tweak

- [ ] **Step 1: Run focused backend tests**

Run: `.\mvnw.cmd test -Dtest=DataSourceServiceTest`
Expected: `BUILD SUCCESS`

- [ ] **Step 2: Run focused frontend tests**

Run: `npm.cmd run test:run -- src/data-source/__tests__/dataSourceApi.test.ts src/data-source/__tests__/DataSourceLibrary.test.tsx`
Expected: PASS

- [ ] **Step 3: Run full frontend tests**

Run: `npm.cmd run test:run`
Expected: PASS

- [ ] **Step 4: Run full frontend build**

Run: `npm.cmd run build`
Expected: PASS

- [ ] **Step 5: Run backend tests**

Run: `.\mvnw.cmd test`
Expected: `BUILD SUCCESS`

## Self-Review

- **Spec coverage:** The plan covers `config.headers`, frontend default seeding, backend validation, fetch merge rules, import/export compatibility, card summaries, and the static HTML preview artifact.
- **Placeholder scan:** Each task has concrete files, commands, and code anchors. Remaining comments inside tests describe assertions to write only where the surrounding step already defines the scenario.
- **Type consistency:** The same `headers: Record<string, string>` contract is used across backend config JSON, frontend types, import/export, and runtime fetch merging.

Plan complete and saved to `docs/superpowers/plans/2026-06-20-data-source-default-headers.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
