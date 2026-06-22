import { describe, expect, it, vi } from "vitest";

import { extractDataSourceVariables, runWidgetRequests } from "../widgetRequestRunner";
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
        kind: "rest",
        dataSourceId: "source-1",
        request: {
          path: "/services",
          method: "GET",
          headers: {},
          body: null
        }
      }
    });
    const metricWidget = widget({
      id: "widget-2",
      type: "metric",
      dataSource: {
        kind: "rest",
        dataSourceId: "source-2",
        request: {
          path: "/health",
          method: "GET",
          headers: {},
          body: null
        }
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
      kind: "rest" as const,
      dataSourceId: "source-1",
      request: {
        path: "/summary",
        method: "GET" as const,
        headers: { Accept: "application/json" },
        body: null
      }
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
      kind: "rest" as const,
      dataSourceId: "source-1",
      request: {
        path: "/summary",
        method: "GET" as const,
        headers: { Accept: "application/json", "X-Team": "ops" },
        body: null
      }
    };
    const secondSource = {
      kind: "rest" as const,
      dataSourceId: "source-1",
      request: {
        path: "/summary",
        method: "GET" as const,
        headers: { "X-Team": "ops", Accept: "application/json" },
        body: null
      }
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

  it("replaces rest data source variable placeholders before fetching", async () => {
    const source = {
      kind: "rest" as const,
      dataSourceId: "source-1",
      request: {
        path: "/users/{{userId}}?team={{team}}",
        method: "POST" as const,
        headers: { "X-Team": "{{team}}" },
        body: "{\"owner\":\"{{userId}}\"}"
      }
    };
    const fetchWidgetData = vi.fn().mockResolvedValueOnce(ok({ total: 12 }));

    await runWidgetRequests({
      dashboardId: "dashboard-1",
      widgets: [widget({ id: "widget-1", dataSource: source })],
      variables: { userId: "42", team: "ops" },
      fetchWidgetData
    });

    expect(fetchWidgetData).toHaveBeenCalledWith("dashboard-1", "widget-1", {
      kind: "rest",
      dataSourceId: "source-1",
      request: {
        path: "/users/42?team=ops",
        method: "POST",
        headers: { "X-Team": "ops" },
        body: "{\"owner\":\"42\"}"
      }
    });
  });

  it("extracts typed variables and defaults untyped tokens to string", () => {
    const variables = extractDataSourceVariables([
      widget({
        dataSource: {
          kind: "rest",
          dataSourceId: "source-1",
          request: {
            path: "/events?region={{region}}&from={{from:datetime}}",
            method: "GET",
            headers: { "X-User": "{{user:string}}" },
            body: null,
          }
        },
      }),
    ]);

    expect(variables).toEqual([
      { name: "from", type: "datetime" },
      { name: "region", type: "string" },
      { name: "user", type: "string" },
    ]);
  });

  it("resolves mixed typed and untyped tokens without type suffixes in output", async () => {
    const source = {
      kind: "rest" as const,
      dataSourceId: "source-1",
      request: {
        path: "/events?region={{region}}&from={{from:datetime}}",
        method: "POST" as const,
        headers: { "X-From": "{{from:datetime}}" },
        body: "{\"from\":\"{{from:datetime}}\",\"region\":\"{{region}}\"}",
      }
    };
    const fetchWidgetData = vi.fn().mockResolvedValueOnce(ok({ total: 8 }));

    await runWidgetRequests({
      dashboardId: "dashboard-1",
      widgets: [widget({ id: "widget-1", dataSource: source })],
      variables: { region: "ap-southeast-1", from: "2026-06-19T09:30" },
      fetchWidgetData,
    });

    expect(fetchWidgetData).toHaveBeenCalledWith("dashboard-1", "widget-1", {
      kind: "rest",
      dataSourceId: "source-1",
      request: {
        path: "/events?region=ap-southeast-1&from=2026-06-19T09:30",
        method: "POST",
        headers: { "X-From": "2026-06-19T09:30" },
        body: "{\"from\":\"2026-06-19T09:30\",\"region\":\"ap-southeast-1\"}",
      }
    });
  });

  it("extracts token variable from responseBindings and uses it for dependent widget headers", async () => {
    const fetchWidgetData = vi
      .fn()
      .mockResolvedValueOnce(ok({ access_token: "tok_123" }))
      .mockResolvedValueOnce(ok({ status: "up" }));

    const tokenWidget = widget({
      id: "widget-token",
      dataSource: {
        kind: "rest",
        dataSourceId: "source-auth",
        request: {
          path: "/token",
          method: "POST",
          headers: {},
          body: "{}"
        },
        responseBindings: [{ variable: "auth_token", jsonPath: "access_token" }]
      }
    });

    const downstreamWidget = widget({
      id: "widget-services",
      dataSource: {
        kind: "rest",
        dataSourceId: "source-services",
        request: {
          path: "/services",
          method: "GET",
          headers: { Authorization: "Bearer {{auth_token}}" },
          body: null
        }
      }
    });

    await runWidgetRequests({
      dashboardId: "dashboard-1",
      widgets: [tokenWidget, downstreamWidget],
      fetchWidgetData,
    });

    expect(fetchWidgetData).toHaveBeenNthCalledWith(
      2,
      "dashboard-1",
      "widget-services",
      expect.objectContaining({
        request: expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Bearer tok_123" }),
        }),
      })
    );
  });

  it("runs token provider first then dependent widgets in later stage", async () => {
    const calls: string[] = [];
    const fetchWidgetData = vi.fn(async (_dashboardId: string, widgetId: string) => {
      calls.push(widgetId);
      if (widgetId === "token-widget") {
        return ok({ data: { token: "abc" } });
      }
      return ok({ result: "ok" });
    });

    const tokenWidget = widget({
      id: "token-widget",
      dataSource: {
        kind: "rest",
        dataSourceId: "source-auth",
        request: {
          path: "/token",
          method: "POST",
          headers: {},
          body: "{}"
        },
        responseBindings: [{ variable: "auth_token", jsonPath: "data.token" }]
      }
    });
    const dependentWidget = widget({
      id: "dependent-widget",
      dataSource: {
        kind: "rest",
        dataSourceId: "source-service",
        request: {
          path: "/service",
          method: "GET",
          headers: { Authorization: "Bearer {{auth_token}}" },
          body: null
        }
      }
    });

    await runWidgetRequests({
      dashboardId: "dashboard-1",
      widgets: [dependentWidget, tokenWidget],
      fetchWidgetData,
    });

    expect(calls).toEqual(["token-widget", "dependent-widget"]);
  });

  it("does not execute dependent widget when required token is missing", async () => {
    const fetchWidgetData = vi.fn().mockResolvedValueOnce(ok({}));

    const tokenWidget = widget({
      id: "token-widget",
      dataSource: {
        kind: "rest",
        dataSourceId: "source-auth",
        request: {
          path: "/token",
          method: "POST",
          headers: {},
          body: "{}"
        },
        responseBindings: [{ variable: "auth_token", jsonPath: "data.token" }]
      }
    });
    const dependentWidget = widget({
      id: "dependent-widget",
      dataSource: {
        kind: "rest",
        dataSourceId: "source-service",
        request: {
          path: "/service",
          method: "GET",
          headers: { Authorization: "Bearer {{auth_token}}" },
          body: null
        }
      }
    });

    const results = await runWidgetRequests({
      dashboardId: "dashboard-1",
      widgets: [tokenWidget, dependentWidget],
      fetchWidgetData,
    });

    expect(fetchWidgetData).toHaveBeenCalledTimes(1);
    expect(results["dependent-widget"]).toEqual({ ok: false, status: 424 });
  });
});
