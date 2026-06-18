import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardViewer } from "../DashboardViewer";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });
}

function renderViewer() {
  render(
    <MemoryRouter initialEntries={["/dashboards/dashboard-1/view"]}>
      <Routes>
        <Route path="/dashboards/:id/view" element={<DashboardViewer />} />
      </Routes>
    </MemoryRouter>
  );
}

const dashboard = {
  id: "dashboard-1",
  name: "Service Operations",
  description: "Latency dashboard",
  widgets: [],
  version: 4
};

const latencyWidget = {
  id: "widget-1",
  title: "Latency",
  type: "metric" as const,
  x: 0,
  y: 0,
  w: 3,
  h: 2,
  displayConfig: { value: "98.4" },
  dataSource: {
    type: "rest" as const,
    url: "https://api.example.test/latency",
    method: "GET" as const,
    headers: {},
    body: null
  }
};

const summaryWidget = {
  id: "widget-2",
  title: "Summary",
  type: "text" as const,
  x: 3,
  y: 0,
  w: 3,
  h: 2,
  displayConfig: { content: "Waiting" },
  dataSource: {
    type: "rest" as const,
    url: "https://api.example.test/summary",
    method: "GET" as const,
    headers: {},
    body: null
  }
};

describe("DashboardViewer search and refresh", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("loads the dashboard and widgets without requesting widget data", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([latencyWidget]));

    renderViewer();

    expect(await screen.findByRole("heading", { name: "Latency" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/dashboards/dashboard-1/widgets/widget-1/fetch",
      expect.anything()
    );
    expect(screen.getByText("98.4")).toBeInTheDocument();
  });

  it("runs widget requests only after Search is clicked", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([latencyWidget]));
    fetchMock.mockResolvedValueOnce(jsonResponse({ value: "123.0" }));

    renderViewer();

    await screen.findByRole("heading", { name: "Latency" });
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/dashboards/dashboard-1/widgets/widget-1/fetch",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(latencyWidget.dataSource)
      })
    );
    expect(await screen.findByText("123.0")).toBeInTheDocument();
  });

  it("sends header variable input values with searched widget requests", async () => {
    const user = userEvent.setup();
    const variableWidget = {
      ...latencyWidget,
      dataSource: {
        ...latencyWidget.dataSource,
        url: "https://api.example.test/latency/{{userId}}"
      }
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([variableWidget]));
    fetchMock.mockResolvedValueOnce(jsonResponse({ value: "123.0" }));

    renderViewer();

    await screen.findByRole("heading", { name: "Latency" });
    await user.type(screen.getByLabelText("userId variable"), "42");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/dashboards/dashboard-1/widgets/widget-1/fetch",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          ...variableWidget.dataSource,
          url: "https://api.example.test/latency/42"
        })
      })
    );
  });

  it("enables Refresh after Search and reruns the last searched request set", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([latencyWidget]));
    fetchMock.mockResolvedValueOnce(jsonResponse({ value: "123.0" }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ value: "124.5" }));

    renderViewer();

    await screen.findByRole("heading", { name: "Latency" });
    const refresh = screen.getByRole("button", { name: "Refresh" });
    expect(refresh).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByText("123.0")).toBeInTheDocument();
    expect(refresh).toBeEnabled();

    await user.click(refresh);
    expect(await screen.findByText("124.5")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("clears a widget's previous result when its refresh fails", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([latencyWidget]));
    fetchMock.mockResolvedValueOnce(jsonResponse({ value: "123.0" }));
    fetchMock.mockResolvedValueOnce(new Response("Bad gateway", { status: 502 }));

    renderViewer();

    await screen.findByRole("heading", { name: "Latency" });
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByText("123.0")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(screen.queryByText("123.0")).not.toBeInTheDocument();
    });
    expect(screen.getByText("HTTP 502 — No data")).toBeInTheDocument();
  });

  it("updates widgets independently as each concurrent request completes", async () => {
    const user = userEvent.setup();
    let resolveLatency: (response: Response) => void = () => undefined;
    let resolveSummary: (response: Response) => void = () => undefined;
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([latencyWidget, summaryWidget]));
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => {
      resolveLatency = resolve;
    }));
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => {
      resolveSummary = resolve;
    }));

    renderViewer();

    await screen.findByRole("heading", { name: "Latency" });
    await user.click(screen.getByRole("button", { name: "Search" }));

    resolveSummary(jsonResponse("summary ready"));
    expect(await screen.findByText("summary ready")).toBeInTheDocument();
    expect(screen.getByText("98.4")).toBeInTheDocument();

    resolveLatency(jsonResponse({ value: "123.0" }));
    const latencyCard = screen.getByRole("heading", { name: "Latency" }).closest("article");
    expect(latencyCard).not.toBeNull();
    expect(await within(latencyCard!).findByText("123.0")).toBeInTheDocument();
  });
});
