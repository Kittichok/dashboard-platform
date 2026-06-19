import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { DashboardLibrary } from "../dashboard/DashboardLibrary";
import { NavCollapseProvider } from "../dashboard/NavCollapseContext";
import { DashboardEditor } from "../widget/DashboardEditor";
import { DashboardViewer } from "../widget/DashboardViewer";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });
}

const dashboard = {
  id: "dashboard-1",
  name: "Service Operations",
  description: "Latency dashboard",
  widgets: [],
  version: 4
};

describe("app layout navbar persistence", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    window.localStorage.clear();
  });

  it("keeps the navbar collapsed when navigating between pages", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    const { container } = render(
      <NavCollapseProvider>
        <MemoryRouter initialEntries={["/dashboards/dashboard-1"]}>
          <Routes>
            <Route path="/dashboards/:id/view" element={<DashboardViewer />} />
            <Route path="/dashboards/:id" element={<DashboardEditor />} />
            <Route path="*" element={<DashboardLibrary />} />
          </Routes>
        </MemoryRouter>
      </NavCollapseProvider>
    );

    await screen.findByRole("heading", { name: "Service Operations" });
    await user.click(screen.getByRole("button", { name: "Collapse navigation" }));

    expect(container.firstElementChild).toHaveClass("app-shell", "sidebar-collapsed");

    await user.click(screen.getByRole("link", { name: /view/i }));

    await screen.findByRole("button", { name: "Expand navigation" });
    expect(container.firstElementChild).toHaveClass("app-shell", "sidebar-collapsed");
  });

  it("applies a stored collapsed preference on the first render", async () => {
    window.localStorage.setItem("ui.nav.collapsed", "true");
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboard));
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    const { container } = render(
      <NavCollapseProvider>
        <MemoryRouter initialEntries={["/dashboards/dashboard-1"]}>
          <Routes>
            <Route path="/dashboards/:id" element={<DashboardEditor />} />
          </Routes>
        </MemoryRouter>
      </NavCollapseProvider>
    );

    expect(container.firstElementChild).toHaveClass("app-shell", "sidebar-collapsed");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Expand navigation" })).toBeInTheDocument();
    });
  });
});
