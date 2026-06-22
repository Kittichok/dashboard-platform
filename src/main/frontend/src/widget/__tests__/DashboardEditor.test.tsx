import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { NavCollapseProvider } from "../../dashboard/NavCollapseContext";
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
    <NavCollapseProvider>
      <MemoryRouter initialEntries={["/dashboards/dashboard-1"]}>
        <Routes>
          <Route path="/dashboards/:id" element={<DashboardEditor />} />
        </Routes>
      </MemoryRouter>
    </NavCollapseProvider>
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
    kind: "rest",
    dataSourceId: "source-1",
    request: {
      path: "/latency",
      method: "GET",
      headers: {},
      body: null
    }
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
    kind: "rest",
    dataSourceId: "source-2",
    request: {
      path: "/users",
      method: "GET",
      headers: {},
      body: null
    }
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
    fetchMock.mockResolvedValueOnce(jsonResponse([
      { id: "source-1", name: "Latency API", type: "rest", config: { baseUrl: "https://api.example.test", authentication: { type: "none" } }, version: 1 }
    ])); // listDataSources
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
      5,
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
    fetchMock.mockResolvedValueOnce(jsonResponse([
      { id: "source-1", name: "Latency API", type: "rest", config: { baseUrl: "https://api.example.test", authentication: { type: "none" } }, version: 1 }
    ])); // listDataSources
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // listTables
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    renderEditor();

    const card = (await screen.findByRole("heading", { name: "Latency" })).closest("article");
    expect(card).not.toBeNull();
    await user.click(card!);
    await user.click(screen.getByRole("button", { name: /test fetch/i }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/dashboards/dashboard-1/widgets/widget-1/fetch",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(latencyWidget.dataSource)
      })
    );
  });

  it("shows variable token examples when editing a REST widget", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([latencyWidget]));
    fetchMock.mockResolvedValueOnce(jsonResponse([
      { id: "source-1", name: "Latency API", type: "rest", config: { baseUrl: "https://api.example.test", authentication: { type: "none" } }, version: 1 }
    ])); // listDataSources
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // listTables

    renderEditor();

    const card = (await screen.findByRole("heading", { name: "Latency" })).closest("article");
    expect(card).not.toBeNull();
    await user.click(card!);

    expect(screen.getByText("Variable examples")).toBeInTheDocument();
    expect(screen.getByText(/\{\{region:string\}\}/)).toBeInTheDocument();
    expect(screen.getByText(/Example path:/)).toBeInTheDocument();
  });

  it("saves response bindings from the widget edit panel", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([latencyWidget]));
    fetchMock.mockResolvedValueOnce(jsonResponse([
      { id: "source-1", name: "Latency API", type: "rest", config: { baseUrl: "https://api.example.test", authentication: { type: "none" } }, version: 1 }
    ])); // listDataSources
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // listTables
    fetchMock.mockResolvedValueOnce(jsonResponse({
      ...latencyWidget,
      dataSource: {
        ...latencyWidget.dataSource,
        responseBindings: [{ variable: "auth_token", jsonPath: "access_token" }]
      }
    }));

    renderEditor();

    const card = (await screen.findByRole("heading", { name: "Latency" })).closest("article");
    expect(card).not.toBeNull();
    await user.click(card!);

    const panel = screen.getByRole("dialog", { name: /edit widget/i });
    await user.click(within(panel).getByRole("button", { name: /add binding/i }));
    await user.type(within(panel).getByRole("textbox", { name: /variable/i }), "auth_token");
    await user.type(within(panel).getByRole("textbox", { name: /json path/i }), "access_token");
    await user.click(within(panel).getByRole("button", { name: /save/i }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/dashboards/dashboard-1/widgets/widget-1?dashboardVersion=4",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          title: "Latency",
          type: "metric",
          x: 0,
          y: 0,
          w: 3,
          h: 2,
          displayConfigJson: JSON.stringify({ value: "98.4" }),
          dataSourceJson: JSON.stringify({
            ...latencyWidget.dataSource,
            responseBindings: [{ variable: "auth_token", jsonPath: "access_token" }]
          })
        })
      })
    );
  });

  it("creates a widget with the full add dialog data source editor", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse([
      { id: "source-1", name: "Latency API", type: "rest", config: { baseUrl: "https://api.example.test", authentication: { type: "none" } }, version: 1 }
    ])); // listDataSources
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // listTables
    fetchMock.mockResolvedValueOnce(jsonResponse({
      id: "widget-9",
      title: "Orders",
      type: "raw_json",
      x: 0,
      y: 0,
      w: 4,
      h: 3,
      displayConfig: null,
      dataSource: {
        kind: "rest",
        dataSourceId: "source-1",
        request: {
          path: "/orders",
          method: "GET",
          headers: {},
          body: null
        },
        responseBindings: [{ variable: "auth_token", jsonPath: "access_token" }]
      }
    }));

    renderEditor();

    await user.click(await screen.findByRole("button", { name: /add widget/i }));

    const dialog = screen.getByRole("dialog", { name: /add widget/i });
    expect(dialog).toHaveClass("dialog--wide");
    await user.type(within(dialog).getByRole("textbox", { name: /title/i }), "Orders");
    const combos = within(dialog).getAllByRole("combobox");
    await user.selectOptions(combos[0], "raw_json");
    expect(combos[0]).toHaveValue("raw_json");
    await user.clear(within(dialog).getByRole("spinbutton", { name: /width/i }));
    await user.type(within(dialog).getByRole("spinbutton", { name: /width/i }), "4");
    await user.clear(within(dialog).getByRole("spinbutton", { name: /height/i }));
    await user.type(within(dialog).getByRole("spinbutton", { name: /height/i }), "3");
    expect(within(dialog).getByRole("option", { name: /raw json/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("option", { name: /json preview/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("combobox", { name: /data source/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /add binding/i })).toBeInTheDocument();

    await user.selectOptions(within(dialog).getByRole("combobox", { name: /data source/i }), "source-1");
    await user.type(within(dialog).getByRole("textbox", { name: /path/i }), "/orders");
    await user.click(within(dialog).getByRole("button", { name: /add binding/i }));
    await user.type(within(dialog).getByRole("textbox", { name: /variable/i }), "auth_token");
    await user.type(within(dialog).getByRole("textbox", { name: /json path/i }), "access_token");
    await user.click(within(dialog).getByRole("button", { name: /add widget/i }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/dashboards/dashboard-1/widgets?dashboardVersion=4",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          title: "Orders",
          type: "raw_json",
          x: 0,
          y: 0,
          w: 4,
          h: 3,
          displayConfigJson: null,
          dataSourceJson: JSON.stringify({
            kind: "rest",
            dataSourceId: "source-1",
            request: {
              path: "/orders",
              method: "GET",
              headers: {},
              body: null
            },
            responseBindings: [{ variable: "auth_token", jsonPath: "access_token" }]
          })
        })
      })
    );
  });

  it("does not change widget position through the edit panel", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([latencyWidget]));
    fetchMock.mockResolvedValueOnce(jsonResponse([
      { id: "source-1", name: "Latency API", type: "rest", config: { baseUrl: "https://api.example.test", authentication: { type: "none" } }, version: 1 }
    ])); // listDataSources
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // listTables
    fetchMock.mockResolvedValueOnce(jsonResponse(latencyWidget));

    renderEditor();

    const card = (await screen.findByRole("heading", { name: "Latency" })).closest("article");
    expect(card).not.toBeNull();
    await user.click(card!);

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/dashboards/dashboard-1/widgets/widget-1?dashboardVersion=4",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          title: "Latency",
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
  });

  it("saves nested selected display fields from a tested JSON Preview data source", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([jsonPreviewWidget]));
    fetchMock.mockResolvedValueOnce(jsonResponse([
      { id: "source-2", name: "Users API", type: "rest", config: { baseUrl: "https://api.example.test", authentication: { type: "none" } }, version: 1 }
    ])); // listDataSources
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // listTables
    fetchMock.mockResolvedValueOnce(jsonResponse({
      name: "Adeel Solangi",
      language: "Sindhi",
      detail: {
        obj: { key: "value" },
        name: "test"
      }
    }));
    fetchMock.mockResolvedValueOnce(jsonResponse({
      ...jsonPreviewWidget,
      displayConfig: { selectedFields: ["detail.obj.key", "detail.name"] }
    }));

    renderEditor();

    const card = (await screen.findByRole("heading", { name: "Users" })).closest("article");
    expect(card).not.toBeNull();
    await user.click(card!);

    const panel = screen.getByRole("dialog", { name: /edit widget/i });
    await user.click(within(panel).getByRole("button", { name: /test fetch/i }));

    await user.click(await within(panel).findByRole("checkbox", { name: "detail.obj.key" }));
    await user.click(within(panel).getByRole("checkbox", { name: "detail.name" }));
    await user.click(within(panel).getByRole("button", { name: /save/i }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
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
          displayConfigJson: JSON.stringify({ selectedFields: ["detail.obj.key", "detail.name"] }),
          dataSourceJson: JSON.stringify(jsonPreviewWidget.dataSource)
        })
      })
    );
  });

  it("shows selectedFields before fetch and saves raw field edits", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([jsonPreviewWidget]));
    fetchMock.mockResolvedValueOnce(jsonResponse([
      { id: "source-2", name: "Users API", type: "rest", config: { baseUrl: "https://api.example.test", authentication: { type: "none" } }, version: 1 }
    ])); // listDataSources
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // listTables
    fetchMock.mockResolvedValueOnce(jsonResponse({
      ...jsonPreviewWidget,
      displayConfig: { selectedFields: ["name", "detail.obj.key"] }
    }));

    renderEditor();

    const card = (await screen.findByRole("heading", { name: "Users" })).closest("article");
    expect(card).not.toBeNull();
    await user.click(card!);

    const panel = screen.getByRole("dialog", { name: /edit widget/i });
    const selectedFieldsInput = within(panel).getByRole("textbox", { name: "selectedFields" });
    expect(selectedFieldsInput).toHaveValue("[]");

    fireEvent.change(selectedFieldsInput, { target: { value: JSON.stringify(["name", "detail.obj.key"]) } });
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
          displayConfigJson: JSON.stringify({ selectedFields: ["name", "detail.obj.key"] }),
          dataSourceJson: JSON.stringify(jsonPreviewWidget.dataSource)
        })
      })
    );
  });

  it("keeps selectedFields text synchronized with fetched field checkboxes", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([jsonPreviewWidget]));
    fetchMock.mockResolvedValueOnce(jsonResponse([
      { id: "source-2", name: "Users API", type: "rest", config: { baseUrl: "https://api.example.test", authentication: { type: "none" } }, version: 1 }
    ])); // listDataSources
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // listTables
    fetchMock.mockResolvedValueOnce(jsonResponse({
      name: "Adeel Solangi",
      detail: {
        obj: { key: "value" }
      }
    }));

    renderEditor();

    const card = (await screen.findByRole("heading", { name: "Users" })).closest("article");
    expect(card).not.toBeNull();
    await user.click(card!);

    const panel = screen.getByRole("dialog", { name: /edit widget/i });
    await user.click(within(panel).getByRole("button", { name: /test fetch/i }));
    await user.click(await within(panel).findByRole("checkbox", { name: "detail.obj.key" }));

    expect(within(panel).getByRole("textbox", { name: "selectedFields" })).toHaveValue(
      JSON.stringify(["detail.obj.key"], null, 2)
    );
  });
});
