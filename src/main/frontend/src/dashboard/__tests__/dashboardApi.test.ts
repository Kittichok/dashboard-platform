import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  createDashboard,
  deleteDashboard,
  duplicateDashboard,
  listDashboards,
  renameDashboard
} from "../dashboardApi";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });
}

describe("dashboardApi", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("requests GET /api/dashboards and decodes the dashboard list", async () => {
    const dashboards = [
      {
        id: "dashboard-1",
        name: "Service Operations",
        description: "Latency and saturation",
        widgets: [],
        version: 4
      }
    ];

    fetchMock.mockResolvedValue(jsonResponse(dashboards));

    await expect(listDashboards()).resolves.toEqual(dashboards);
    expect(fetchMock).toHaveBeenCalledWith("/api/dashboards", expect.anything());
  });

  it("posts create input as JSON and returns the created dashboard", async () => {
    const input = {
      name: "Executive Summary",
      description: "Quarterly KPIs"
    };
    const createdDashboard = {
      id: "dashboard-2",
      widgets: [],
      version: 1,
      ...input
    };

    fetchMock.mockResolvedValue(jsonResponse(createdDashboard, { status: 201 }));

    await expect(createDashboard(input)).resolves.toEqual(createdDashboard);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/dashboards",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(input)
      })
    );
  });

  it("patches /api/dashboards/{id} with the submitted version and returns the renamed dashboard", async () => {
    const renamedDashboard = {
      id: "dashboard-3",
      name: "Revenue Pulse",
      description: "Booked and forecast revenue",
      widgets: [],
      version: 8
    };

    fetchMock.mockResolvedValue(jsonResponse(renamedDashboard));

    await expect(
      renameDashboard("dashboard-3", {
        name: "Revenue Pulse",
        description: "Booked and forecast revenue",
        version: 7
      })
    ).resolves.toEqual(renamedDashboard);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/dashboards/dashboard-3",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          name: "Revenue Pulse",
          description: "Booked and forecast revenue",
          version: 7
        })
      })
    );
  });

  it("posts to the duplicate endpoint and returns the duplicated dashboard", async () => {
    const duplicate = {
      id: "dashboard-4",
      name: "Revenue Pulse Copy",
      description: "Booked and forecast revenue",
      widgets: [{ id: "widget-1", type: "line" }],
      version: 1
    };

    fetchMock.mockResolvedValue(jsonResponse(duplicate, { status: 201 }));

    await expect(duplicateDashboard("dashboard-3")).resolves.toEqual(duplicate);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/dashboards/dashboard-3/duplicate",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("sends the dashboard version in the delete query string and accepts 204 responses", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteDashboard("dashboard-3", 7)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/dashboards/dashboard-3?version=7",
      expect.objectContaining({
        method: "DELETE"
      })
    );
  });

  it("decodes structured API failures separately from successful responses", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          code: "dashboard_version_conflict",
          message: "The dashboard changed after it was loaded.",
          fieldErrors: {}
        },
        { status: 409 }
      )
    );

    await expect(
      renameDashboard("dashboard-3", {
        name: "Revenue Pulse",
        description: "Booked and forecast revenue",
        version: 7
      })
    ).rejects.toMatchObject({
      kind: "api",
      status: 409,
      code: "dashboard_version_conflict",
      message: "The dashboard changed after it was loaded.",
      fieldErrors: {}
    });
  });

  it("represents network failures separately from structured API failures", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(listDashboards()).rejects.toMatchObject({
      kind: "network"
    });
  });
});
