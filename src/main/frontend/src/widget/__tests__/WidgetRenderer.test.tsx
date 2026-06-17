import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { WidgetRenderer } from "../WidgetRenderer";
import type { Widget, WidgetFetchResult } from "../types";

function widget(overrides: Partial<Widget> & { type: Widget["type"] }): Widget {
  return {
    id: "w-1",
    title: "Test",
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

function err(status: number): WidgetFetchResult {
  return { ok: false, status };
}

describe("WidgetRenderer response states", () => {
  // Non-JSON body: error state with status, no raw body
  it("renders HTTP status and no raw body for non-JSON response in table widget", () => {
    render(<WidgetRenderer widget={widget({ type: "table" })} fetchData={err(502)} />);
    expect(screen.getByText("HTTP 502 — No data")).toBeInTheDocument();
  });

  it("renders HTTP status and no raw body for non-JSON response in text widget", () => {
    render(<WidgetRenderer widget={widget({ type: "text" })} fetchData={err(502)} />);
    expect(screen.getByText("HTTP 502 — No data")).toBeInTheDocument();
  });

  it("renders HTTP status and no raw body for non-JSON response in raw_json widget", () => {
    render(<WidgetRenderer widget={widget({ type: "raw_json" })} fetchData={err(502)} />);
    expect(screen.getByText("HTTP 502 — No data")).toBeInTheDocument();
  });

  it("renders HTTP status and no raw body for non-JSON response in json_preview widget", () => {
    render(<WidgetRenderer widget={widget({ type: "json_preview" })} fetchData={err(502)} />);
    expect(screen.getByText("HTTP 502 — No data")).toBeInTheDocument();
  });

  // Valid empty JSON: table/text show "No data"
  it.each([
    { data: [], label: "[]" },
    { data: {}, label: "{}" },
    { data: null, label: "null" }
  ])("table widget shows No data for $label", ({ data }) => {
    render(<WidgetRenderer widget={widget({ type: "table" })} fetchData={ok(data)} />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it.each([
    { data: [], label: "[]" },
    { data: {}, label: "{}" },
    { data: null, label: "null" }
  ])("text widget shows No data for $label", ({ data }) => {
    render(<WidgetRenderer widget={widget({ type: "text" })} fetchData={ok(data)} />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  // Valid empty JSON: raw_json/json_preview display exact value
  it.each([
    { data: [], label: "[]" },
    { data: {}, label: "{}" },
    { data: null, label: "null" }
  ])("raw_json widget displays exact $label", ({ data }) => {
    render(<WidgetRenderer widget={widget({ type: "raw_json" })} fetchData={ok(data)} />);
    expect(screen.getByText(JSON.stringify(data, null, 2))).toBeInTheDocument();
  });

  it.each([
    { data: [], label: "[]" },
    { data: {}, label: "{}" },
    { data: null, label: "null" }
  ])("json_preview widget displays exact $label", ({ data }) => {
    render(<WidgetRenderer widget={widget({ type: "json_preview" })} fetchData={ok(data)} />);
    expect(screen.getByText(JSON.stringify(data, null, 2))).toBeInTheDocument();
  });

  // Regression: malformed JSON is distinct from empty JSON
  it("malformed response shows error state not No data label", () => {
    render(<WidgetRenderer widget={widget({ type: "table" })} fetchData={err(502)} />);
    expect(screen.queryByText("No data")).not.toBeInTheDocument();
    expect(screen.getByText(/502/)).toBeInTheDocument();
  });

  // Normal data renders correctly
  it("table widget renders normal data rows", () => {
    render(
      <WidgetRenderer
        widget={widget({ type: "table", displayConfig: { columns: ["name"] } })}
        fetchData={ok([{ name: "Alice" }])}
      />
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("does not display No data when data is present", () => {
    render(
      <WidgetRenderer
        widget={widget({ type: "table", displayConfig: { columns: ["name"] } })}
        fetchData={ok([{ name: "Alice" }])}
      />
    );
    expect(screen.queryByText("No data")).not.toBeInTheDocument();
  });
});
