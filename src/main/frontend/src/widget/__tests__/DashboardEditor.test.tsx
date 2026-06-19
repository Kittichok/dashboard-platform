import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { DashboardEditor } from "../DashboardEditor";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });
}

function renderEditor() {
  render(
    <MemoryRouter initialEntries={["/dashboards/dashboard-1"]}>
      <Routes>
        <Route path="/dashboards/:id" element={<DashboardEditor />} />
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
};

const notesWidget = {
  id: "widget-2",
  title: "Notes",
  type: "text",
  x: 3,
  y: 0,
  w: 3,
  h: 2,
  displayConfig: { content: "Healthy" },
  dataSource: null
};

const jsonPreviewWidget = {
  id: "widget-3",
  title: "Users",
  type: "json_preview",
  x: 0,
  y: 2,
  w: 3,
  h: 2,
  displayConfig: null,
  dataSource: {
    type: "rest",
    url: "https://api.example.test/users",
    method: "GET",
    headers: {},
    body: null
  }
};

describe("DashboardEditor", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders widgets with WidgetRenderer content", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([latencyWidget]));

    renderEditor();

    expect(await screen.findByRole("heading", { name: "Latency" })).toBeInTheDocument();
    expect(screen.getByText("98.4")).toBeInTheDocument();
  });

  it("opens the edit panel from a widget card and saves changes through updateWidget", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([latencyWidget]));
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // listTables
    fetchMock.mockResolvedValueOnce(jsonResponse({
      ...latencyWidget,
      title: "Latency P95"
    }));

    renderEditor();

    const card = (await screen.findByRole("heading", { name: "Latency" })).closest("article");
    expect(card).not.toBeNull();
    await user.click(card!);

    const panel = screen.getByRole("dialog", { name: /edit widget/i });
    const titleInput = within(panel).getByRole("textbox", { name: /title/i });
    await user.clear(titleInput);
    await user.type(titleInput, "Latency P95");
    await user.click(within(panel).getByRole("button", { name: /save/i }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/dashboards/dashboard-1/widgets/widget-1?dashboardVersion=4",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          title: "Latency P95",
          type: "metric",
          x: 0,
          y: 0,
          w: 3,
          h: 2,
          displayConfigJson: JSON.stringify({ value: "98.4" }),
          dataSourceJson: JSON.stringify(latencyWidget.dataSource)
        })
      })
    );

    expect(await screen.findByRole("heading", { name: "Latency P95" })).toBeInTheDocument();
  });

  it("uses the real dashboard id when testing widget fetches", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([latencyWidget]));
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // listTables
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    renderEditor();

    const card = (await screen.findByRole("heading", { name: "Latency" })).closest("article");
    expect(card).not.toBeNull();
    await user.click(card!);
    await user.click(screen.getByRole("button", { name: /test fetch/i }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/dashboards/dashboard-1/widgets/widget-1/fetch",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("shows variable token examples when editing a REST widget", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([latencyWidget]));
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // listTables

    renderEditor();

    const card = (await screen.findByRole("heading", { name: "Latency" })).closest("article");
    expect(card).not.toBeNull();
    await user.click(card!);

    expect(screen.getByText("Variable examples")).toBeInTheDocument();
    expect(screen.getByText(/\{\{region:string\}\}/)).toBeInTheDocument();
    expect(screen.getByText(/Example URL:/)).toBeInTheDocument();
  });

  it("updates widget position through the edit panel", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([latencyWidget]));
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // listTables
    fetchMock.mockResolvedValueOnce(jsonResponse({
      ...latencyWidget,
      x: 3,
      y: 2
    }));

    renderEditor();

    const card = (await screen.findByRole("heading", { name: "Latency" })).closest("article");
    expect(card).not.toBeNull();
    await user.click(card!);

    const xInput = screen.getByRole("spinbutton", { name: /x/i });
    await user.clear(xInput);
    await user.type(xInput, "3");

    const yInput = screen.getByRole("spinbutton", { name: /y/i });
    await user.clear(yInput);
    await user.type(yInput, "2");

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/dashboards/dashboard-1/widgets/widget-1?dashboardVersion=4",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          title: "Latency",
          type: "metric",
          x: 3,
          y: 2,
          w: 3,
          h: 2,
          displayConfigJson: JSON.stringify({ value: "98.4" }),
          dataSourceJson: JSON.stringify(latencyWidget.dataSource)
        })
      })
    );
  });

  it("saves selected display fields from a tested JSON Preview data source", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([jsonPreviewWidget]));
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // listTables
    fetchMock.mockResolvedValueOnce(jsonResponse([
      { id: 1, name: "Alice", email: "alice@example.test" },
      { id: 2, name: "Grace", email: "grace@example.test" }
    ]));
    fetchMock.mockResolvedValueOnce(jsonResponse({
      ...jsonPreviewWidget,
      displayConfig: { selectedFields: ["name", "email"] }
    }));

    renderEditor();

    const card = (await screen.findByRole("heading", { name: "Users" })).closest("article");
    expect(card).not.toBeNull();
    await user.click(card!);

    const panel = screen.getByRole("dialog", { name: /edit widget/i });
    await user.click(within(panel).getByRole("button", { name: /test fetch/i }));

    await user.click(await within(panel).findByRole("checkbox", { name: "name" }));
    await user.click(within(panel).getByRole("checkbox", { name: "email" }));
    await user.click(within(panel).getByRole("button", { name: /save/i }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/dashboards/dashboard-1/widgets/widget-3?dashboardVersion=4",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          title: "Users",
          type: "json_preview",
          x: 0,
          y: 2,
          w: 3,
          h: 2,
          displayConfigJson: JSON.stringify({ selectedFields: ["name", "email"] }),
          dataSourceJson: JSON.stringify(jsonPreviewWidget.dataSource)
        })
      })
    );
  });
});
