import { useState } from "react";

import type { DataSource, Widget } from "./types";
import { fetchWidgetData } from "./widgetApi";
import { WidgetFetchResult } from "./WidgetFetchResult";

type WidgetDataSourceFormProps = {
  widget: Widget;
};

interface WidgetFetchResultData {
  fetchError?: boolean;
  status?: number;
  body?: string;
  [key: string]: unknown;
}

export function WidgetDataSourceForm({ widget }: WidgetDataSourceFormProps) {
  const [url, setUrl] = useState(widget.dataSource?.url ?? "");
  const [method, setMethod] = useState<"GET" | "POST">(widget.dataSource?.method ?? "GET");
  const [headers, setHeaders] = useState<Record<string, string>>(widget.dataSource?.headers ?? {});
  const [body, setBody] = useState(widget.dataSource?.body ?? "");
  const [headerKey, setHeaderKey] = useState("");
  const [headerValue, setHeaderValue] = useState("");
  const [fetchResult, setFetchResult] = useState<WidgetFetchResultData | null>(null);

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

  async function testFetch() {
    if (!widget.id) return;
    try {
      const result = (await fetchWidgetData("PLACEHOLDER", widget.id)) as WidgetFetchResultData;
      setFetchResult(result);
    } catch (err: unknown) {
      setFetchResult({ fetchError: true, status: 0, body: String(err) });
    }
  }

  return (
    <fieldset style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "12px", marginTop: "12px" }}>
      <legend style={{ fontSize: "12px", fontWeight: 750, color: "var(--muted)" }}>Data Source</legend>
      <label className="dialog-field">
        <span>URL</span>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com/data" />
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
      <button type="button" className="button secondary" onClick={testFetch} style={{ marginTop: "8px" }}>
        Test Fetch
      </button>
      {fetchResult ? <WidgetFetchResult result={fetchResult} /> : null}
    </fieldset>
  );
}
