import type { Widget } from "./types";

type WidgetRendererProps = {
  widget: Widget;
};

export function WidgetRenderer({ widget }: WidgetRendererProps) {
  switch (widget.type) {
    case "table":
      return <TableWidget widget={widget} />;
    case "chart":
      return <ChartWidget widget={widget} />;
    case "metric":
      return <MetricWidget widget={widget} />;
    case "text":
      return <TextWidget widget={widget} />;
  }
}

function TableWidget({ widget }: WidgetRendererProps) {
  const columns = (widget.displayConfig?.columns as string[]) ?? [];
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
            {columns.length === 0 ? <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid var(--line)" }}>Data</th> : null}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: "8px", color: "var(--muted)" }} colSpan={Math.max(columns.length, 1)}>No data available</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ChartWidget({ widget }: WidgetRendererProps) {
  return (
    <div style={{ padding: "16px", textAlign: "center" }}>
      <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "12px" }}>{widget.title}</p>
      <svg viewBox="0 0 200 100" style={{ width: "100%", maxHeight: "120px" }}>
        <polyline
          points="0,80 20,60 40,70 60,40 80,50 100,30 120,45 140,20 160,35 180,25 200,10"
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

function MetricWidget({ widget }: WidgetRendererProps) {
  const value = widget.displayConfig?.value as string | undefined;
  return (
    <div style={{ padding: "16px", textAlign: "center" }}>
      <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "4px" }}>{widget.title}</p>
      <p style={{ fontSize: "32px", fontWeight: 700, margin: 0, color: "var(--text)" }}>
        {value ?? "\u2014"}
      </p>
    </div>
  );
}

function TextWidget({ widget }: WidgetRendererProps) {
  const content = widget.displayConfig?.content as string | undefined;
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
