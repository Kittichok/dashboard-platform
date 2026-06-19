import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addWidget,
  listWidgets,
  reorderWidgets,
  updateWidget
} from "../widgetApi";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });
}

describe("widgetApi", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("normalizes parsed widget response objects", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([
      {
        id: "widget-1",
        title: "Latency",
        type: "metric",
        x: 0,
        y: 0,
        w: 3,
        h: 2,
        displayConfig: { value: "98.4" },
        dataSource: {
          type: "rest",
          url: "https://api.example.test/latency",
          method: "GET",
          headers: {},
          body: null
        }
      }
    ]));

    await expect(listWidgets("dashboard-1")).resolves.toEqual([
      expect.objectContaining({
        displayConfig: { value: "98.4" },
        dataSource: expect.objectContaining({
          url: "https://api.example.test/latency"
        })
      })
    ]);
  });

  it("normalizes legacy string JSON widget response fields", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      id: "widget-2",
      title: "Notes",
      type: "text",
      x: 0,
      y: 0,
      w: 4,
      h: 2,
      displayConfigJson: "{\"content\":\"Hello\"}",
      dataSourceJson: null
    }, { status: 201 }));

    await expect(addWidget("dashboard-1", 7, {
      title: "Notes",
      type: "text",
      x: 0,
      y: 0,
      w: 4,
      h: 2
    })).resolves.toMatchObject({
      displayConfig: { content: "Hello" },
      dataSource: null
    });
  });

  it("patches widget updates with the current dashboard version", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      id: "widget-3",
      title: "Updated",
      type: "table",
      x: 1,
      y: 0,
      w: 6,
      h: 3,
      displayConfig: null,
      dataSource: null
    }));

    await updateWidget("dashboard-1", "widget-3", 8, {
      title: "Updated",
      type: "table",
      x: 1,
      y: 0,
      w: 6,
      h: 3
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/dashboards/dashboard-1/widgets/widget-3?dashboardVersion=8",
      expect.objectContaining({
        method: "PATCH"
      })
    );
  });

  it("sends ordered widget ids to the reorder endpoint", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await reorderWidgets("dashboard-1", 9, ["widget-2", "widget-1"]);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/dashboards/dashboard-1/widgets/order?dashboardVersion=9",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ orderedIds: ["widget-2", "widget-1"] })
      })
    );
  });
});
