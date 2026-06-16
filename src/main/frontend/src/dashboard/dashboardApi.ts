import type { ApiFailure, Dashboard, DashboardInput, NetworkFailure } from "./types";

type ApiErrorBody = {
  code?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function listDashboards(): Promise<Dashboard[]> {
  return request<Dashboard[]>("/api/dashboards", { method: "GET" });
}

export async function createDashboard(input: DashboardInput): Promise<Dashboard> {
  return request<Dashboard>("/api/dashboards", jsonRequest("POST", input));
}

export async function renameDashboard(
  id: string,
  input: DashboardInput & { version: number }
): Promise<Dashboard> {
  return request<Dashboard>(`/api/dashboards/${id}`, jsonRequest("PATCH", input));
}

export async function duplicateDashboard(id: string): Promise<Dashboard> {
  return request<Dashboard>(`/api/dashboards/${id}/duplicate`, { method: "POST" });
}

export async function deleteDashboard(id: string, version: number): Promise<void> {
  await request<void>(`/api/dashboards/${id}?version=${encodeURIComponent(version)}`, {
    method: "DELETE"
  });
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
