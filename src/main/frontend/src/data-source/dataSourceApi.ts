import type { ApiFailure, NetworkFailure } from "../dashboard/types";
import type { DataSource, DataSourceInput } from "./types";

type ApiErrorBody = {
  code?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function listDataSources(): Promise<DataSource[]> {
  return request<DataSource[]>("/api/data-sources", { method: "GET" });
}

export async function createDataSource(input: DataSourceInput): Promise<DataSource> {
  return request<DataSource>("/api/data-sources", jsonRequest("POST", input));
}

export async function updateDataSource(
  id: string,
  input: DataSourceInput & { version: number }
): Promise<DataSource> {
  return request<DataSource>(`/api/data-sources/${id}`, jsonRequest("PATCH", input));
}

export async function deleteDataSource(id: string, version: number): Promise<void> {
  await request<void>(`/api/data-sources/${id}?version=${encodeURIComponent(version)}`, {
    method: "DELETE"
  });
}

export async function importDataSource(input: DataSourceInput): Promise<DataSource> {
  return request<DataSource>("/api/data-sources/import", jsonRequest("POST", input));
}

export async function exportDataSource(
  id: string
): Promise<{ name: string; type: "rest"; config: DataSource["config"] }> {
  return request(`/api/data-sources/${id}/export`, { method: "GET" });
}

function jsonRequest(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    throw {
      kind: "network",
      message: error instanceof Error ? error.message : "Network request failed."
    } satisfies NetworkFailure;
  }

  if (!response.ok) {
    throw await apiFailure(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function apiFailure(response: Response): Promise<ApiFailure> {
  let body: ApiErrorBody = {};
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    body = {};
  }

  return {
    kind: "api",
    status: response.status,
    code: body.code ?? "http_error",
    message: body.message ?? "Request failed.",
    fieldErrors: body.fieldErrors ?? {}
  };
}
