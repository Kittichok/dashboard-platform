import { useEffect, useState } from "react";

import { listDataSources } from "../data-source/dataSourceApi";
import type { DataSource as SharedDataSource } from "../data-source/types";
import {
  extractSelectableFields,
  selectedFieldsFromConfig,
  withSelectedFields
} from "./displayConfig";
import { WidgetFieldSelector } from "./WidgetFieldSelector";
import type { DataSource, ResponseBinding, Widget } from "./types";
import { fetchWidgetData, listColumns, listTables } from "./widgetApi";
import { WidgetFetchResult } from "./WidgetFetchResult";

type WidgetDataSourceFormProps = {
  dashboardId: string;
  widget: Widget;
  displayConfig?: Record<string, unknown> | null;
  onChange?: (dataSource: DataSource) => void;
  onDisplayConfigChange?: (displayConfig: Record<string, unknown> | null) => void;
};

type WidgetFetchResultData =
  | { ok: true; data: unknown }
  | { ok: false; status: number }
  | { fetchError: true; status: number; body: string };

function isSuccessfulFetchResult(
  result: WidgetFetchResultData | null
): result is { ok: true; data: unknown } {
  return Boolean(result && "ok" in result && result.ok === true);
}

function isTableDataSource(dataSource: DataSource | null): dataSource is Extract<DataSource, { type: "table" }> {
  return Boolean(dataSource && "type" in dataSource && dataSource.type === "table");
}

function isRestDataSource(dataSource: DataSource | null): dataSource is Extract<DataSource, { kind: "rest" }> | Extract<DataSource, { type: "rest" }> {
  return Boolean(
    dataSource
      && (("kind" in dataSource && dataSource.kind === "rest") || ("type" in dataSource && dataSource.type === "rest"))
  );
}

type BindingRow = ResponseBinding & { id: string };

function createBindingRow(binding?: ResponseBinding): BindingRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    variable: binding?.variable ?? "",
    jsonPath: binding?.jsonPath ?? ""
  };
}

export function WidgetDataSourceForm({
  dashboardId,
  widget,
  displayConfig,
  onChange,
  onDisplayConfigChange
}: WidgetDataSourceFormProps) {
  const initType = widget.dataSource && "type" in widget.dataSource ? widget.dataSource.type : "rest";
  const [sourceType, setSourceType] = useState<"rest" | "table">(initType);
  const [selectedSourceId, setSelectedSourceId] = useState(
    widget.dataSource && "kind" in widget.dataSource && widget.dataSource.kind === "rest"
      ? widget.dataSource.dataSourceId
      : ""
  );
  const [path, setPath] = useState(
    widget.dataSource && "kind" in widget.dataSource && widget.dataSource.kind === "rest"
      ? widget.dataSource.request.path
      : ""
  );
  const [method, setMethod] = useState<"GET" | "POST">(
    widget.dataSource && "kind" in widget.dataSource && widget.dataSource.kind === "rest"
      ? widget.dataSource.request.method
      : "GET"
  );
  const [headers, setHeaders] = useState<Record<string, string>>(
    widget.dataSource && "kind" in widget.dataSource && widget.dataSource.kind === "rest"
      ? widget.dataSource.request.headers
      : {}
  );
  const [body, setBody] = useState(
    widget.dataSource && "kind" in widget.dataSource && widget.dataSource.kind === "rest"
      ? widget.dataSource.request.body ?? ""
      : ""
  );
  const [responseBindings, setResponseBindings] = useState<BindingRow[]>(
    isRestDataSource(widget.dataSource)
      ? (widget.dataSource.responseBindings ?? []).map((binding) => createBindingRow(binding))
      : []
  );
  const [headerKey, setHeaderKey] = useState("");
  const [headerValue, setHeaderValue] = useState("");
  const [tableName, setTableName] = useState(
    isTableDataSource(widget.dataSource) ? widget.dataSource.table : ""
  );
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    isTableDataSource(widget.dataSource) ? widget.dataSource.columns : []
  );
  const [rowLimit, setRowLimit] = useState<number | null>(
    isTableDataSource(widget.dataSource) ? widget.dataSource.limit : null
  );
  const [restSources, setRestSources] = useState<SharedDataSource[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fetchResult, setFetchResult] = useState<WidgetFetchResultData | null>(null);
  const [selectedFieldsText, setSelectedFieldsText] = useState("[]");
  const [selectedFieldsError, setSelectedFieldsError] = useState<string | null>(null);
  const selectedDisplayFields = selectedFieldsFromConfig(displayConfig ?? widget.displayConfig);
  const selectedDisplayFieldsJson = JSON.stringify(selectedDisplayFields, null, 2);
  const selectableFields = isSuccessfulFetchResult(fetchResult) ? extractSelectableFields(fetchResult.data) : [];
  const supportsFieldSelection = widget.type === "table" || widget.type === "json_preview";

  useEffect(() => {
    listDataSources().then(setRestSources).catch(() => setRestSources([]));
    listTables(dashboardId).then(setTables).catch(() => {});
  }, [dashboardId]);

  useEffect(() => {
    if (!tableName) { setColumns([]); return; }
    listColumns(dashboardId, tableName).then(setColumns).catch(() => setColumns([]));
  }, [dashboardId, tableName]);

  useEffect(() => {
    setSelectedFieldsText(selectedDisplayFieldsJson);
    setSelectedFieldsError(null);
  }, [selectedDisplayFieldsJson]);

  useEffect(() => {
    if (sourceType === "rest") {
      const nextDataSource: DataSource = {
        kind: "rest",
        dataSourceId: selectedSourceId,
        request: {
          path,
          method,
          headers,
          body: body || null
        }
      };
      if (responseBindings.length > 0) {
        nextDataSource.responseBindings = responseBindings.map(({ variable, jsonPath }) => ({ variable, jsonPath }));
      }
      onChange?.(nextDataSource);
    } else {
      onChange?.({
        type: "table",
        table: tableName,
        columns: selectedColumns,
        limit: rowLimit,
      });
    }
  }, [sourceType, selectedSourceId, path, method, headers, body, responseBindings, tableName, selectedColumns, rowLimit, onChange]);

  function addHeader() {
    if (!headerKey.trim()) return;
    setHeaders((prev) => ({ ...prev, [headerKey.trim()]: headerValue }));
    setHeaderKey("");
    setHeaderValue("");
  }

  function removeHeader(key: string) {
    setHeaders((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function addBinding() {
    setResponseBindings((prev) => [...prev, createBindingRow()]);
  }

  function updateBinding(index: number, key: keyof ResponseBinding, value: string) {
    setResponseBindings((prev) => prev.map((binding, bindingIndex) => (
      bindingIndex === index ? { ...binding, [key]: value } : binding
    )));
  }

  function removeBinding(index: number) {
    setResponseBindings((prev) => prev.filter((_, bindingIndex) => bindingIndex !== index));
  }

  function toggleColumn(col: string) {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  }

  function updateDisplayFields(fields: string[]) {
    onDisplayConfigChange?.(withSelectedFields(displayConfig ?? widget.displayConfig, fields));
  }

  function updateSelectedFieldsText(value: string) {
    setSelectedFieldsText(value);
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed) || !parsed.every((field) => typeof field === "string")) {
        setSelectedFieldsError("selectedFields must be a JSON array of strings.");
        return;
      }
      setSelectedFieldsError(null);
      updateDisplayFields(parsed);
    } catch {
      setSelectedFieldsError("selectedFields must be valid JSON.");
    }
  }

  function currentDataSource(): DataSource {
    if (sourceType === "rest") {
      const nextDataSource: DataSource = {
        kind: "rest",
        dataSourceId: selectedSourceId,
        request: {
          path,
          method,
          headers,
          body: body || null
        }
      };
      if (responseBindings.length > 0) {
        nextDataSource.responseBindings = responseBindings.map(({ variable, jsonPath }) => ({ variable, jsonPath }));
      }
      return nextDataSource;
    }
    return { type: "table", table: tableName, columns: selectedColumns, limit: rowLimit };
  }

  async function testFetch() {
    if (!widget.id) return;
    try {
      const result = (await fetchWidgetData(dashboardId, widget.id, currentDataSource())) as WidgetFetchResultData;
      setFetchResult(result);
    } catch (err: unknown) {
      setFetchResult({ fetchError: true, status: 0, body: String(err) });
    }
  }

  return (
    <fieldset style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "12px", marginTop: "12px" }}>
      <legend style={{ fontSize: "12px", fontWeight: 750, color: "var(--muted)" }}>Data Source</legend>

      <label className="dialog-field">
        <span>Type</span>
        <select value={sourceType} onChange={(e) => { setSourceType(e.target.value as "rest" | "table"); setFetchResult(null); }}
          style={{ width: "100%", padding: "8px", borderRadius: "7px", border: "1px solid var(--line)", background: "var(--surface-warm)" }}>
          <option value="rest">REST API</option>
          <option value="table">Database Table</option>
        </select>
      </label>

      {sourceType === "rest" ? (
        <>
          <div
            style={{
              marginBottom: "12px",
              padding: "10px",
              borderRadius: "8px",
              border: "1px dashed var(--line)",
              background: "var(--surface-warm)",
              fontSize: "12px",
              color: "var(--muted)",
            }}
          >
            <strong style={{ display: "block", marginBottom: "6px", color: "var(--text)" }}>
              Variable examples
            </strong>
            <div>String: {"{{region}}"} or {"{{region:string}}"}</div>
            <div>Datetime: {"{{from:datetime}}"} (renders as datetime picker in dashboard view)</div>
            <div style={{ marginTop: "6px" }}>
              Example path: /events?region={"{{region}}"}&amp;from={"{{from:datetime}}"}
            </div>
          </div>
          <label className="dialog-field">
            <span>Data Source</span>
            <select value={selectedSourceId} onChange={(e) => setSelectedSourceId(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "7px", border: "1px solid var(--line)", background: "var(--surface-warm)" }}>
              <option value="">-- Select a data source --</option>
              {restSources.map((source) => (
                <option key={source.id} value={source.id}>{source.name}</option>
              ))}
            </select>
          </label>
          <label className="dialog-field">
            <span>Path</span>
            <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/data" />
          </label>
          <label className="dialog-field">
            <span>Method</span>
            <select value={method} onChange={(e) => setMethod(e.target.value as "GET" | "POST")}
              style={{ width: "100%", padding: "8px", borderRadius: "7px", border: "1px solid var(--line)", background: "var(--surface-warm)" }}>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
          </label>
          <div style={{ marginBottom: "12px" }}>
            <span style={{ display: "block", marginBottom: "6px", fontSize: "10px", fontWeight: 750, color: "var(--muted)", textTransform: "uppercase" }}>
              Headers
            </span>
            {Object.entries(headers).map(([key, value]) => (
              <div key={key} style={{ display: "flex", gap: "8px", marginBottom: "6px", alignItems: "center" }}>
                <code style={{ fontSize: "12px", flex: 1 }}>{key}: {value}</code>
                <button type="button" className="icon-button" aria-label="Remove header" onClick={() => removeHeader(key)}>×</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                placeholder="Key"
                value={headerKey}
                onChange={(e) => setHeaderKey(e.target.value)}
                style={{ width: "40%", padding: "6px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "12px" }}
              />
              <input
                placeholder="Value"
                value={headerValue}
                onChange={(e) => setHeaderValue(e.target.value)}
                style={{ flex: 1, padding: "6px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "12px" }}
              />
              <button type="button" className="button secondary" onClick={addHeader} style={{ fontSize: "12px", padding: "4px 10px" }}>
                Add
              </button>
            </div>
          </div>
          {method === "POST" ? (
            <label className="dialog-field">
              <span>Body</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                style={{ width: "100%", padding: "8px", borderRadius: "7px", border: "1px solid var(--line)", background: "var(--surface-warm)", fontFamily: "monospace", fontSize: "12px" }}
              />
            </label>
          ) : null}

          <section style={{ marginTop: "16px", padding: "12px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface-warm)" }}>
            <div style={{ marginBottom: "10px" }}>
              <strong style={{ display: "block", marginBottom: "4px", color: "var(--text)" }}>Response Bindings</strong>
              <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.45 }}>
                Capture values from a successful response and make them available as runtime variables for later widgets.
              </div>
            </div>

            {responseBindings.length > 0 ? (
              <div style={{ display: "grid", gap: "10px" }}>
                {responseBindings.map((binding, index) => (
                  <div
                    key={binding.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1.4fr auto",
                      gap: "10px",
                      alignItems: "start",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid var(--line)",
                      background: "rgba(255,255,255,0.7)"
                    }}
                  >
                    <label className="dialog-field" style={{ marginBottom: 0 }}>
                      <span>Variable</span>
                      <input
                        value={binding.variable}
                        onChange={(e) => updateBinding(index, "variable", e.target.value)}
                        placeholder="auth_token"
                      />
                      <small className="field-error" style={{ color: "var(--muted)" }}>
                        Use <code style={{ fontFamily: "monospace" }}>[A-Za-z0-9_.-]+</code>
                      </small>
                    </label>
                    <label className="dialog-field" style={{ marginBottom: 0 }}>
                      <span>JSON Path</span>
                      <input
                        value={binding.jsonPath}
                        onChange={(e) => updateBinding(index, "jsonPath", e.target.value)}
                        placeholder="access_token"
                      />
                      <small className="field-error" style={{ color: "var(--muted)" }}>
                        Simple dot path, optionally with array indices.
                      </small>
                    </label>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Remove binding"
                      onClick={() => removeBinding(index)}
                      style={{ marginTop: "28px" }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "10px", flexWrap: "wrap" }}>
              <button type="button" className="button secondary" onClick={addBinding} style={{ fontSize: "12px", padding: "4px 10px" }}>
                Add binding
              </button>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                Applies only after a successful widget fetch.
              </span>
            </div>
          </section>
        </>
      ) : (
        <>
          <label className="dialog-field">
            <span>Table</span>
            <select value={tableName} onChange={(e) => { setTableName(e.target.value); setSelectedColumns([]); }}
              style={{ width: "100%", padding: "8px", borderRadius: "7px", border: "1px solid var(--line)", background: "var(--surface-warm)" }}>
              <option value="">-- Select a table --</option>
              {tables.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          {tableName && columns.length > 0 ? (
            <div style={{ marginBottom: "12px" }}>
              <span style={{ display: "block", marginBottom: "6px", fontSize: "10px", fontWeight: 750, color: "var(--muted)", textTransform: "uppercase" }}>
                Columns
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {columns.map((col) => (
                  <label key={col} style={{
                    display: "flex", alignItems: "center", gap: "4px",
                    fontSize: "12px", cursor: "pointer",
                    padding: "4px 8px", borderRadius: "6px",
                    border: "1px solid var(--line)",
                    background: selectedColumns.includes(col) ? "var(--blue-100, #e0edff)" : "var(--surface-warm)"
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(col)}
                      onChange={() => toggleColumn(col)}
                    />
                    {col}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <label className="dialog-field">
            <span>Row Limit</span>
            <input
              type="number"
              min={0}
              value={rowLimit ?? ""}
              onChange={(e) => setRowLimit(e.target.value ? Number(e.target.value) : null)}
              placeholder="No limit"
              style={{ width: "100%", padding: "8px", borderRadius: "7px", border: "1px solid var(--line)", background: "var(--surface-warm)" }}
            />
          </label>
        </>
      )}

      <button type="button" className="button secondary" onClick={testFetch} style={{ marginTop: "8px" }}>
        Test Fetch
      </button>
      {fetchResult && !supportsFieldSelection ? <WidgetFetchResult result={fetchResult} /> : null}
      {supportsFieldSelection ? (
        <>
          <WidgetFieldSelector
            fields={selectableFields}
            selectedFields={selectedDisplayFields}
            onChange={updateDisplayFields}
          />
          <label className="dialog-field" style={{ marginTop: "12px" }}>
            <span>selectedFields</span>
            <textarea
              aria-invalid={Boolean(selectedFieldsError)}
              value={selectedFieldsText}
              onChange={(e) => updateSelectedFieldsText(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "7px",
                border: "1px solid var(--line)",
                background: "var(--surface-warm)",
                fontFamily: "monospace",
                fontSize: "12px"
              }}
            />
            {selectedFieldsError ? <small className="field-error">{selectedFieldsError}</small> : null}
          </label>
        </>
      ) : null}
    </fieldset>
  );
}
