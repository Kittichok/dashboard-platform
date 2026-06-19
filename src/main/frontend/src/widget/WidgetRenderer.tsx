import {
  fieldValueAtPath,
  filterDataToFields,
  legacyColumnsFromConfig,
  selectedFieldsFromConfig
} from "./displayConfig";
import type { Widget, WidgetFetchResult } from "./types";

type WidgetRendererProps = {
  widget: Widget;
  fetchData?: WidgetFetchResult;
};

export function WidgetRenderer({ widget, fetchData }: WidgetRendererProps) {
  switch (widget.type) {
    case "table":
      return <TableWidget widget={widget} fetchData={fetchData} />;
    case "chart":
      return <ChartWidget widget={widget} fetchData={fetchData} />;
    case "metric":
      return <MetricWidget widget={widget} fetchData={fetchData} />;
    case "text":
      return <TextWidget widget={widget} fetchData={fetchData} />;
    case "raw_json":
      return <RawJsonWidget widget={widget} fetchData={fetchData} />;
    case "json_preview":
      return <JsonPreviewWidget widget={widget} fetchData={fetchData} />;
  }
}

function ErrorDisplay({ status }: { status: number }) {
  return (
    <div style={{ padding: "16px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
      HTTP {status} — No data
    </div>
  );
}

function NoDataDisplay() {
  return (
    <div style={{ padding: "16px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
      No data
    </div>
  );
}

function formatTableCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "\u2014";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function TableWidget({ widget, fetchData }: WidgetRendererProps) {
  if (fetchData === undefined) {
    const selectedFields = selectedFieldsFromConfig(widget.displayConfig);
    const columns = selectedFields.length > 0 ? selectedFields : legacyColumnsFromConfig(widget.displayConfig);
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead><tr><th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid var(--line)" }}>Data</th></tr></thead>
          <tbody><tr><td style={{ padding: "8px", color: "var(--muted)" }}>No data available</td></tr></tbody>
        </table>
      </div>
    );
  }
  if (!fetchData.ok) return <ErrorDisplay status={fetchData.status} />;
  const d = fetchData.data;
  if (d === null || (Array.isArray(d) && d.length === 0) || (typeof d === "object" && d !== null && Object.keys(d).length === 0)) {
    return <NoDataDisplay />;
  }

  const selectedFields = selectedFieldsFromConfig(widget.displayConfig);
  const columns = selectedFields.length > 0 ? selectedFields : legacyColumnsFromConfig(widget.displayConfig);
  const rows = Array.isArray(d) ? d as Record<string, unknown>[] : [];
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid var(--line)", fontWeight: 600 }}>
                {col}
              </th>
            ))}
            {columns.length === 0 && rows.length > 0 ? Object.keys(rows[0]).map((col) => (
              <th key={col} style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid var(--line)", fontWeight: 600 }}>
                {col}
              </th>
            )) : null}
            {columns.length === 0 && rows.length === 0 ? <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid var(--line)" }}>Data</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? rows.map((row, i) => (
            <tr key={i}>
              {(columns.length > 0 ? columns : Object.keys(rows[0])).map((col) => (
                <td key={col} style={{ padding: "8px", borderBottom: "1px solid var(--line)" }}>
                  {formatTableCellValue(fieldValueAtPath(row, col))}
                </td>
              ))}
            </tr>
          )) : (
            <tr>
              <td style={{ padding: "8px", color: "var(--muted)" }} colSpan={Math.max(columns.length, 1)}>No data available</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ChartWidget({ widget, fetchData }: WidgetRendererProps) {
  if (fetchData === undefined || (fetchData.ok && (fetchData.data === null || (Array.isArray(fetchData.data) && fetchData.data.length === 0) || (typeof fetchData.data === "object" && fetchData.data !== null && Object.keys(fetchData.data).length === 0)))) {
    return (
      <div style={{ padding: "16px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "12px" }}>{widget.title}</p>
      </div>
    );
  }
  if (!fetchData.ok) {
    return (
      <div style={{ padding: "16px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "12px" }}>{widget.title}</p>
        <ErrorDisplay status={fetchData.status} />
      </div>
    );
  }

  const data = fetchData.data;
  let values: number[] = [];
  if (Array.isArray(data)) {
    values = data.map((v) => {
      if (typeof v === "number") return v;
      if (typeof v === "object" && v !== null && "value" in v) return Number((v as Record<string, unknown>).value);
      return 0;
    });
  }
  const maxVal = Math.max(...values, 1);
  const svgPoints = values.length > 1
    ? values.map((v, i) => `${(i / (values.length - 1)) * 180 + 10},${100 - (v / maxVal) * 80}`).join(" ")
    : "0,80 20,60 40,70 60,40 80,50 100,30 120,45 140,20 160,35 180,25 200,10";
  return (
    <div style={{ padding: "16px", textAlign: "center" }}>
      <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "12px" }}>{widget.title}</p>
      <svg viewBox="0 0 200 100" style={{ width: "100%", maxHeight: "120px" }}>
        <polyline
          points={svgPoints}
          fill="none"
          stroke="var(--blue-600)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function MetricWidget({ widget, fetchData }: WidgetRendererProps) {
  const displayVal = widget.displayConfig?.value as string | undefined;
  let liveVal: string | undefined;

  if (fetchData === undefined) {
    // no data, use displayConfig fallback
  } else if (!fetchData.ok) {
    return (
      <div style={{ padding: "16px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "4px" }}>{widget.title}</p>
        <ErrorDisplay status={fetchData.status} />
      </div>
    );
  } else {
    const data = fetchData.data;
    if (typeof data === "number" || typeof data === "string") {
      liveVal = String(data);
    } else if (typeof data === "object" && data !== null && "value" in (data as Record<string, unknown>)) {
      liveVal = String((data as Record<string, unknown>).value);
    }
  }
  const value = liveVal ?? displayVal;
  return (
    <div style={{ padding: "16px", textAlign: "center" }}>
      <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "4px" }}>{widget.title}</p>
      <p style={{ fontSize: "32px", fontWeight: 700, margin: 0, color: "var(--text)" }}>
        {value ?? "\u2014"}
      </p>
    </div>
  );
}

function TextWidget({ widget, fetchData }: WidgetRendererProps) {
  const displayContent = widget.displayConfig?.content as string | undefined;
  let liveContent: string | undefined;

  if (fetchData === undefined) {
    // no data, use displayConfig fallback
  } else if (!fetchData.ok) {
    return <ErrorDisplay status={fetchData.status} />;
  } else {
    const d = fetchData.data;
    if (d === null || (Array.isArray(d) && d.length === 0) || (typeof d === "object" && d !== null && Object.keys(d).length === 0)) {
      return <NoDataDisplay />;
    }
    if (typeof d === "string") {
      liveContent = d;
    } else {
      liveContent = JSON.stringify(d, null, 2);
    }
  }
  const content = liveContent ?? displayContent;
  return (
    <div style={{ padding: "16px" }}>
      <pre style={{
        margin: 0,
        fontSize: "13px",
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontFamily: "inherit",
        color: "var(--text)"
      }}>
        {content ?? ""}
      </pre>
    </div>
  );
}

function RawJsonWidget({ widget, fetchData }: WidgetRendererProps) {
  if (fetchData === undefined) {
    return (
      <div style={{ padding: "16px" }}>
        <pre style={{
          margin: 0,
          fontSize: "13px",
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "inherit",
          color: "var(--text)"
        }}>
          {JSON.stringify(widget.displayConfig, null, 2)}
        </pre>
      </div>
    );
  }
  if (!fetchData.ok) return <ErrorDisplay status={fetchData.status} />;

  return (
    <div style={{ padding: "16px" }}>
      <pre style={{
        margin: 0,
        fontSize: "13px",
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontFamily: "inherit",
        color: "var(--text)"
      }}>
        {JSON.stringify(fetchData.data, null, 2)}
      </pre>
    </div>
  );
}

function JsonPreviewWidget({ widget, fetchData }: WidgetRendererProps) {
  if (fetchData === undefined) {
    return (
      <div style={{ padding: "16px" }}>
        <pre style={{
          margin: 0,
          fontSize: "13px",
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "inherit",
          color: "var(--text)"
        }}>
          {JSON.stringify(widget.displayConfig, null, 2)}
        </pre>
      </div>
    );
  }
  if (!fetchData.ok) return <ErrorDisplay status={fetchData.status} />;

  return (
    <div style={{ padding: "16px" }}>
      <pre style={{
        margin: 0,
        fontSize: "13px",
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontFamily: "inherit",
        color: "var(--text)"
      }}>
        {JSON.stringify(
          filterDataToFields(fetchData.data, selectedFieldsFromConfig(widget.displayConfig)),
          null,
          2
        )}
      </pre>
    </div>
  );
}
