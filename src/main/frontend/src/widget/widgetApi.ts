import type { ApiFailure, NetworkFailure } from "../dashboard/types";
import type { DataSource, Widget, WidgetFetchResult, WidgetInput } from "./types";

type ApiErrorBody = {
  code?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

type WidgetResponse = Omit<Widget, "displayConfig" | "dataSource"> & {
  displayConfig?: Record<string, unknown> | null;
  dataSource?: DataSource | null;
  displayConfigJson?: string | null;
  dataSourceJson?: string | null;
};

type WidgetRequest = Omit<WidgetInput, "displayConfig" | "dataSource"> & {
  displayConfigJson: string | null;
  dataSourceJson: string | null;
};

function versionQuery(v: number): string {
  return `?dashboardVersion=${encodeURIComponent(v)}`;
}

export async function listWidgets(dashboardId: string): Promise<Widget[]> {
  const widgets = await request<WidgetResponse[]>(`/api/dashboards/${dashboardId}/widgets`, { method: "GET" });
  return widgets.map(normalizeWidget);
}

export async function addWidget(
  dashboardId: string,
  dashboardVersion: number,
  input: WidgetInput
): Promise<Widget> {
  const widget = await request<WidgetResponse>(
    `/api/dashboards/${dashboardId}/widgets${versionQuery(dashboardVersion)}`,
    jsonRequest("POST", widgetRequest(input))
  );
  return normalizeWidget(widget);
}

export async function updateWidget(
  dashboardId: string,
  widgetId: string,
  dashboardVersion: number,
  input: WidgetInput
): Promise<Widget> {
  const widget = await request<WidgetResponse>(
    `/api/dashboards/${dashboardId}/widgets/${widgetId}${versionQuery(dashboardVersion)}`,
    jsonRequest("PATCH", widgetRequest(input))
  );
  return normalizeWidget(widget);
}

export async function reorderWidgets(
  dashboardId: string,
  dashboardVersion: number,
  orderedIds: string[]
): Promise<Widget[]> {
  const widgets = await request<WidgetResponse[]>(
    `/api/dashboards/${dashboardId}/widgets/order${versionQuery(dashboardVersion)}`,
    jsonRequest("PUT", { orderedIds })
  );
  return widgets.map(normalizeWidget);
}

export async function exportWidget(
  dashboardId: string,
  widgetId: string
): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(
    `/api/dashboards/${dashboardId}/widgets/${widgetId}/export`,
    { method: "GET" }
  );
}

export async function importWidget(
  dashboardId: string,
  dashboardVersion: number,
  input: WidgetInput
): Promise<Widget> {
  const body = {
    title: input.title,
    type: input.type,
    x: input.x,
    y: input.y,
    w: input.w,
    h: input.h,
    displayConfig: input.displayConfig ?? null,
    dataSource: input.dataSource ?? null
  };
  return request<WidgetResponse>(
    `/api/dashboards/${dashboardId}/widgets/import${versionQuery(dashboardVersion)}`,
    jsonRequest("POST", body)
  ).then(normalizeWidget);
}

export async function removeWidget(
  dashboardId: string,
  widgetId: string,
  dashboardVersion: number
): Promise<void> {
  await request<void>(
    `/api/dashboards/${dashboardId}/widgets/${widgetId}${versionQuery(dashboardVersion)}`,
    { method: "DELETE" }
  );
}

export async function fetchWidgetData(
  dashboardId: string,
  widgetId: string,
  dataSource?: DataSource
): Promise<WidgetFetchResult> {
  const init: RequestInit = { method: "POST" };
  if (dataSource) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(dataSource);
  }
  let response: Response;
  try {
    response = await fetch(
      `/api/dashboards/${dashboardId}/widgets/${widgetId}/fetch`,
      init
    );
  } catch {
    return { ok: false, status: 0 };
  }
  if (!response.ok) {
    return { ok: false, status: response.status };
  }
  const text = await response.text();
  if (text.length === 0) {
    return { ok: false, status: response.status };
  }
  try {
    const data = JSON.parse(text) as unknown;
    return { ok: true, data };
  } catch {
    return { ok: false, status: response.status };
  }
}

export async function listTables(dashboardId: string): Promise<string[]> {
  return request<string[]>(
    `/api/dashboards/${dashboardId}/widgets/tables`,
    { method: "GET" }
  );
}

export async function listColumns(dashboardId: string, table: string): Promise<string[]> {
  return request<string[]>(
    `/api/dashboards/${dashboardId}/widgets/tables/${encodeURIComponent(table)}/columns`,
    { method: "GET" }
  );
}

function jsonRequest(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}

function widgetRequest(input: WidgetInput): WidgetRequest {
  return {
    title: input.title,
    type: input.type,
    x: input.x,
    y: input.y,
    w: input.w,
    h: input.h,
    displayConfigJson: input.displayConfig ? JSON.stringify(input.displayConfig) : null,
    dataSourceJson: input.dataSource ? JSON.stringify(input.dataSource) : null
  };
}

function normalizeWidget(response: WidgetResponse): Widget {
  return {
    id: response.id,
    title: response.title,
    type: response.type,
    x: response.x,
    y: response.y,
    w: response.w,
    h: response.h,
    displayConfig: response.displayConfig ?? parseObject(response.displayConfigJson),
    dataSource: response.dataSource ?? parseObject<DataSource>(response.dataSourceJson)
  };
}

function parseObject<T>(json: string | null | undefined): T | null {
  if (!json) {
    return null;
  }
  const value = JSON.parse(json) as unknown;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as T;
  }
  return null;
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
