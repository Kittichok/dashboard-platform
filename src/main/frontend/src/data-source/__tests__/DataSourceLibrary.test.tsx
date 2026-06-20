import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { NavCollapseProvider } from "../../dashboard/NavCollapseContext";
import { DataSourceLibrary } from "../DataSourceLibrary";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });
}

function renderLibrary() {
  render(<NavCollapseProvider><MemoryRouter><DataSourceLibrary /></MemoryRouter></NavCollapseProvider>);
}

describe("DataSourceLibrary", () => {
  const fetchMock = vi.fn();
  const createObjectURL = vi.fn(() => "blob:export");
  const revokeObjectURL = vi.fn();
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchMock.mockReset();
    createObjectURL.mockReset();
    revokeObjectURL.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(URL, "createObjectURL", { writable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { writable: true, value: revokeObjectURL });
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  it("renders fetched data sources, filters them, and shows empty states", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse([
      {
        id: "source-1",
        name: "Orders API",
        type: "rest",
        config: {
          baseUrl: "https://api.example.test/orders",
          authentication: { type: "none" },
          headers: { "Content-Type": "application/json" }
        },
        version: 1
      }
    ]));

    renderLibrary();

    expect(await screen.findByRole("heading", { name: "Orders API" })).toBeInTheDocument();
    const searchBox = screen.getByRole("searchbox", { name: /search data sources/i });
    await user.type(searchBox, "billing");
    expect(screen.getByText(/no data sources found/i)).toBeInTheDocument();
  });

  it("seeds Content-Type for new data sources and lets the user edit header rows", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({
        id: "source-1",
        name: "Orders API",
        type: "rest",
        config: {
          baseUrl: "https://api.example.test/orders",
          authentication: { type: "none" },
          headers: {
            "Content-Type": "application/ld+json",
            Accept: "application/json"
          }
        },
        version: 1
      }, { status: 201 }));

    renderLibrary();

    await screen.findByText(/no data sources yet/i);
    await user.click(screen.getByRole("button", { name: /new data source/i }));
    const dialog = screen.getByRole("dialog", { name: /create data source/i });
    expect(within(dialog).getByDisplayValue("Content-Type")).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue("application/json")).toBeInTheDocument();
    await user.type(within(dialog).getByRole("textbox", { name: /^name$/i }), "Orders API");
    await user.type(within(dialog).getByRole("textbox", { name: /^base url$/i }), "https://api.example.test/orders");
    await user.clear(within(dialog).getByLabelText("Header value 1"));
    await user.type(within(dialog).getByLabelText("Header value 1"), "application/ld+json");
    await user.click(within(dialog).getByRole("button", { name: /add header/i }));
    await user.type(within(dialog).getByLabelText("Header name 2"), "Accept");
    await user.type(within(dialog).getByLabelText("Header value 2"), "application/json");
    await user.click(within(dialog).getByRole("button", { name: /create data source/i }));

    expect(await screen.findByRole("heading", { name: "Orders API" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/data-sources",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Orders API",
          type: "rest",
          config: {
            baseUrl: "https://api.example.test/orders",
            authentication: { type: "none" },
            headers: {
              "Content-Type": "application/ld+json",
              Accept: "application/json"
            }
          }
        })
      })
    );
  });

  it("creates, imports, exports, and blocks delete with backend references", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({
        id: "source-1",
        name: "Orders API",
        type: "rest",
        config: {
          baseUrl: "https://api.example.test/orders",
          authentication: { type: "none" },
          headers: { "Content-Type": "application/json" }
        },
        version: 1
      }, { status: 201 }))
      .mockResolvedValueOnce(jsonResponse({
        id: "source-2",
        name: "Billing API",
        type: "rest",
        config: {
          baseUrl: "https://api.example.test/billing",
          authentication: { type: "none" },
          headers: { "Content-Type": "application/json" }
        },
        version: 1
      }, { status: 201 }))
      .mockResolvedValueOnce(jsonResponse({
        name: "Orders API",
        type: "rest",
        config: {
          baseUrl: "https://api.example.test/orders",
          authentication: { type: "none" },
          headers: { "Content-Type": "application/json" }
        }
      }))
      .mockResolvedValueOnce(jsonResponse({
        code: "data_source_in_use",
        message: "The data source is still referenced by widgets.",
        fieldErrors: {
          references: "Service Operations / Latency"
        }
      }, { status: 400 }));

    renderLibrary();

    await screen.findByText(/no data sources yet/i);
    await user.click(screen.getByRole("button", { name: /new data source/i }));
    const dialog = screen.getByRole("dialog", { name: /create data source/i });
    await user.type(within(dialog).getByRole("textbox", { name: /^name$/i }), "Orders API");
    await user.type(within(dialog).getByRole("textbox", { name: /^base url$/i }), "https://api.example.test/orders");
    await user.click(within(dialog).getByRole("button", { name: /create data source/i }));

    expect(await screen.findByRole("heading", { name: "Orders API" })).toBeInTheDocument();

    const file = new File([JSON.stringify({
      name: "Billing API",
      type: "rest",
      config: {
        baseUrl: "https://api.example.test/billing",
        authentication: { type: "none" },
        headers: { "Content-Type": "application/json" }
      }
    })], "billing.json", { type: "application/json" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);
    expect(await screen.findByRole("heading", { name: "Billing API" })).toBeInTheDocument();

    const ordersCard = screen.getByRole("heading", { name: "Orders API" }).closest("article");
    expect(ordersCard).not.toBeNull();
    await user.click(within(ordersCard!).getByRole("button", { name: /export/i }));
    expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/data-sources/source-1/export", expect.objectContaining({ method: "GET" }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    await user.click(within(ordersCard!).getByRole("button", { name: /delete/i }));
    await user.click(screen.getByRole("button", { name: /delete data source/i }));
    expect(await screen.findByText(/service operations \/ latency/i)).toBeInTheDocument();
  });
});
