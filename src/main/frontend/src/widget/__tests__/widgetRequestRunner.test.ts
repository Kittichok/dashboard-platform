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
