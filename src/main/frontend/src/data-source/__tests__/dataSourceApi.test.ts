import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createDataSource,
  exportDataSource,
  listDataSources,
  updateDataSource
} from "../dataSourceApi";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });
}

describe("dataSourceApi", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("lists data sources", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([
      {
        id: "source-1",
        name: "Orders API",
        type: "rest",
        config: {
          baseUrl: "https://api.example.test",
          authentication: { type: "none" },
          headers: { "Content-Type": "application/json" }
        },
        version: 2
      }
    ]));

    await expect(listDataSources()).resolves.toEqual([
      expect.objectContaining({
        name: "Orders API",
        config: expect.objectContaining({
          baseUrl: "https://api.example.test",
          headers: { "Content-Type": "application/json" }
        })
      })
    ]);
  });

  it("posts create and patch requests with json config bodies", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      id: "source-1",
      name: "Orders API",
      type: "rest",
      config: {
        baseUrl: "https://api.example.test",
        authentication: { type: "none" },
        headers: { "Content-Type": "application/json" }
      },
      version: 1
    }, { status: 201 }));
    fetchMock.mockResolvedValueOnce(jsonResponse({
      id: "source-1",
      name: "Orders API V2",
      type: "rest",
      config: {
        baseUrl: "https://api.example.test/v2",
        authentication: { type: "none" },
        headers: { "Content-Type": "application/json", Accept: "application/json" }
      },
      version: 2
    }));

    await createDataSource({
      name: "Orders API",
      type: "rest",
      config: {
        baseUrl: "https://api.example.test",
        authentication: { type: "none" },
        headers: { "Content-Type": "application/json" }
      }
    });
    await updateDataSource("source-1", {
      name: "Orders API V2",
      type: "rest",
      config: {
        baseUrl: "https://api.example.test/v2",
        authentication: { type: "none" },
        headers: { "Content-Type": "application/json", Accept: "application/json" }
      },
      version: 1
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/data-sources",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Orders API",
          type: "rest",
          config: {
            baseUrl: "https://api.example.test",
            authentication: { type: "none" },
            headers: { "Content-Type": "application/json" }
          }
        })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/data-sources/source-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          name: "Orders API V2",
          type: "rest",
          config: {
            baseUrl: "https://api.example.test/v2",
            authentication: { type: "none" },
            headers: { "Content-Type": "application/json", Accept: "application/json" }
          },
          version: 1
        })
      })
    );
  });

  it("exports a data source as importable json config", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        name: "Orders API",
        type: "rest",
        config: {
          baseUrl: "https://api.example.test",
          authentication: { type: "none" },
          headers: { "Content-Type": "application/json" }
        }
      })
    );

    await expect(exportDataSource("source-1")).resolves.toEqual({
      name: "Orders API",
      type: "rest",
      config: {
        baseUrl: "https://api.example.test",
        authentication: { type: "none" },
        headers: { "Content-Type": "application/json" }
      }
    });
  });
});
