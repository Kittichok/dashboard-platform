import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { NavCollapseProvider } from "../NavCollapseContext";
import { DashboardLibrary } from "../DashboardLibrary";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });
}

function getCard(name: string) {
  const heading = screen.getByRole("heading", { name });
  const card = heading.closest("article");

  if (!card) {
    throw new Error(`Could not find dashboard card for ${name}.`);
  }

  return within(card);
}

describe("DashboardLibrary", () => {
  const fetchMock = vi.fn();

  const serviceOperations = {
    id: "dashboard-1",
    name: "Service Operations",
    description: "Latency and saturation overview",
    widgets: [],
    version: 4
  };

  const revenuePulse = {
    id: "dashboard-2",
    name: "Revenue Pulse",
    description: "Booked and forecast revenue",
    widgets: [],
    version: 6
  };

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("shows a loading status, renders fetched dashboards, filters case-insensitively, and shows a no-results state", async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValueOnce(jsonResponse([serviceOperations, revenuePulse]));

    render(<NavCollapseProvider><MemoryRouter><DashboardLibrary /></MemoryRouter></NavCollapseProvider>);

    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);

    expect(await screen.findByRole("heading", { name: "Service Operations" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Revenue Pulse" })).toBeInTheDocument();

    const searchBox = screen.getByRole("searchbox", { name: /search dashboards/i });

    await user.type(searchBox, "reVeNuE");
    expect(screen.getByRole("heading", { name: "Revenue Pulse" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Service Operations" })).not.toBeInTheDocument();

    await user.clear(searchBox);
    await user.type(searchBox, "LATENCY");
    expect(screen.getByRole("heading", { name: "Service Operations" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Revenue Pulse" })).not.toBeInTheDocument();

    await user.clear(searchBox);
    await user.type(searchBox, "not a real dashboard");
    expect(screen.getByText(/no dashboards found/i)).toBeInTheDocument();
  });

  it("shows an empty-library state when the API returns no dashboards", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    render(<NavCollapseProvider><MemoryRouter><DashboardLibrary /></MemoryRouter></NavCollapseProvider>);

    expect(await screen.findByText(/no dashboards yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new dashboard/i })).toBeInTheDocument();
  });

  it("validates create input immediately and posts a new dashboard when the dialog is submitted", async () => {
    const user = userEvent.setup();
    const createdDashboard = {
      id: "dashboard-3",
      name: "Executive Summary",
      description: "Quarterly KPIs",
      widgets: [],
      version: 1
    };

    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse(createdDashboard, { status: 201 }));

    render(<NavCollapseProvider><MemoryRouter><DashboardLibrary /></MemoryRouter></NavCollapseProvider>);

    await screen.findByText(/no dashboards yet/i);
    await user.click(screen.getByRole("button", { name: /new dashboard/i }));

    const dialog = screen.getByRole("dialog", { name: /create dashboard/i });
    const nameInput = within(dialog).getByRole("textbox", { name: /name/i });
    const descriptionInput = within(dialog).getByRole("textbox", { name: /description/i });

    await user.click(within(dialog).getByRole("button", { name: /create dashboard/i }));
    expect(within(dialog).getByText(/name is required/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.type(nameInput, "Executive Summary");
    await user.click(descriptionInput);
    await user.paste("x".repeat(501));
    expect(within(dialog).getByText(/description must be 500 characters or fewer/i)).toBeInTheDocument();

    await user.clear(descriptionInput);
    await user.type(descriptionInput, "Quarterly KPIs");
    await user.click(within(dialog).getByRole("button", { name: /create dashboard/i }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/dashboards",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Executive Summary",
          description: "Quarterly KPIs"
        })
      })
    );

    expect(await screen.findByRole("heading", { name: "Executive Summary" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /create dashboard/i })).not.toBeInTheDocument();
    });
  });

  it("keeps the rename dialog open and preserves typed input after a conflict response", async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValueOnce(jsonResponse([serviceOperations]));
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          code: "dashboard_version_conflict",
          message: "The dashboard changed after it was loaded.",
          fieldErrors: {}
        },
        { status: 409 }
      )
    );

    render(<NavCollapseProvider><MemoryRouter><DashboardLibrary /></MemoryRouter></NavCollapseProvider>);

    await screen.findByRole("heading", { name: "Service Operations" });
    await user.click(getCard("Service Operations").getByRole("button", { name: /rename/i }));

    const dialog = screen.getByRole("dialog", { name: /rename dashboard/i });
    const nameInput = within(dialog).getByRole("textbox", { name: /name/i });

    await user.clear(nameInput);
    await user.type(nameInput, "Operations Central");
    await user.click(within(dialog).getByRole("button", { name: /save/i }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/dashboards/dashboard-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          name: "Operations Central",
          description: "Latency and saturation overview",
          version: 4
        })
      })
    );

    expect(screen.getByRole("dialog", { name: /rename dashboard/i })).toBeInTheDocument();
    expect(nameInput).toHaveValue("Operations Central");
    expect(within(dialog).getByText(/reload/i)).toBeInTheDocument();
  });

  it("duplicates a dashboard and renders the returned copy", async () => {
    const user = userEvent.setup();
    const duplicate = {
      id: "dashboard-9",
      name: "Revenue Pulse Copy",
      description: "Booked and forecast revenue",
      widgets: [],
      version: 1
    };

    fetchMock.mockResolvedValueOnce(jsonResponse([revenuePulse]));
    fetchMock.mockResolvedValueOnce(jsonResponse(duplicate, { status: 201 }));

    render(<NavCollapseProvider><MemoryRouter><DashboardLibrary /></MemoryRouter></NavCollapseProvider>);

    await screen.findByRole("heading", { name: "Revenue Pulse" });
    await user.click(getCard("Revenue Pulse").getByRole("button", { name: /duplicate/i }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/dashboards/dashboard-2/duplicate",
      expect.objectContaining({
        method: "POST"
      })
    );

    expect(await screen.findByRole("heading", { name: "Revenue Pulse Copy" })).toBeInTheDocument();
  });

  it("requires explicit delete confirmation before issuing DELETE and removes the dashboard after a 204 response", async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValueOnce(jsonResponse([serviceOperations]));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    render(<NavCollapseProvider><MemoryRouter><DashboardLibrary /></MemoryRouter></NavCollapseProvider>);

    await screen.findByRole("heading", { name: "Service Operations" });
    await user.click(getCard("Service Operations").getByRole("button", { name: /delete/i }));

    const dialog = screen.getByRole("dialog", { name: /delete dashboard/i });
    expect(within(dialog).getByText(/service operations/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /cancel/i }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: "Service Operations" })).toBeInTheDocument();

    await user.click(getCard("Service Operations").getByRole("button", { name: /delete/i }));
    await user.click(screen.getByRole("button", { name: /delete dashboard/i }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/dashboards/dashboard-1?version=4",
      expect.objectContaining({
        method: "DELETE"
      })
    );

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Service Operations" })).not.toBeInTheDocument();
    });
  });

  it("shows a dismissible notice when an unexpected mutation failure occurs", async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValueOnce(jsonResponse([revenuePulse]));
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          code: "internal_error",
          message: "Something went wrong. Please try again later.",
          fieldErrors: {}
        },
        { status: 500 }
      )
    );

    render(<NavCollapseProvider><MemoryRouter><DashboardLibrary /></MemoryRouter></NavCollapseProvider>);

    await screen.findByRole("heading", { name: "Revenue Pulse" });
    await user.click(getCard("Revenue Pulse").getByRole("button", { name: /duplicate/i }));

    const notice = await screen.findByRole("alert");
    expect(notice).toHaveTextContent(/something went wrong/i);

    await user.click(within(notice).getByRole("button", { name: /dismiss/i }));
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
