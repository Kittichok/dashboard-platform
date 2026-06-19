import { fetchWidgetData as defaultFetchWidgetData } from "./widgetApi";
import type { DataSource, DataSourceVariable, VariableType, Widget, WidgetFetchResult } from "./types";

type FetchWidgetData = (
  dashboardId: string,
  widgetId: string,
  dataSource?: DataSource
) => Promise<WidgetFetchResult>;

type RunWidgetRequestsInput = {
  dashboardId: string;
  widgets: Widget[];
  variables?: Record<string, string>;
  fetchWidgetData?: FetchWidgetData;
  onWidgetResult?: (widgetId: string, result: WidgetFetchResult) => void;
};

export async function runWidgetRequests({
  dashboardId,
  widgets,
  variables = {},
  fetchWidgetData = defaultFetchWidgetData,
  onWidgetResult
}: RunWidgetRequestsInput): Promise<Record<string, WidgetFetchResult>> {
  const results: Record<string, WidgetFetchResult> = {};
  const groups = new Map<string, Widget[]>();

  for (const widget of widgets) {
    if (!widget.dataSource) {
      continue;
    }
    const resolved = resolveDataSourceVariables(widget.dataSource, variables);
    const resolvedWidget = { ...widget, dataSource: resolved };
    const key = stableStringify(resolved);
    groups.set(key, [...(groups.get(key) ?? []), resolvedWidget]);
  }

  await Promise.all(
    Array.from(groups.values()).map(async (group) => {
      const representative = group[0];
      const result = await fetchWidgetData(
        dashboardId,
        representative.id,
        representative.dataSource ?? undefined
      );
      for (const widget of group) {
        results[widget.id] = result;
        onWidgetResult?.(widget.id, result);
      }
    })
  );

  return results;
}

export function extractDataSourceVariables(widgets: Widget[]): DataSourceVariable[] {
  const names = new Map<string, DataSourceVariable>();
  for (const widget of widgets) {
    const source = widget.dataSource;
    if (!source || source.type !== "rest") {
      continue;
    }
    collectVariables(source.url, names);
    Object.entries(source.headers).forEach(([key, value]) => {
      collectVariables(key, names);
      collectVariables(value, names);
    });
    if (source.body) {
      collectVariables(source.body, names);
    }
  }
  return Array.from(names.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function resolveDataSourceVariables(dataSource: Widget["dataSource"], variables: Record<string, string>): Widget["dataSource"] {
  if (!dataSource || dataSource.type !== "rest") {
    return dataSource;
  }

  return {
    ...dataSource,
    url: replaceVariables(dataSource.url, variables),
    headers: Object.fromEntries(
      Object.entries(dataSource.headers).map(([key, value]) => [
        replaceVariables(key, variables),
        replaceVariables(value, variables)
      ])
    ),
    body: dataSource.body === null ? null : replaceVariables(dataSource.body, variables)
  };
}

function collectVariables(value: string, names: Map<string, DataSourceVariable>) {
  for (const match of value.matchAll(variablePattern())) {
    const name = match[1];
    if (!names.has(name)) {
      names.set(name, {
        name,
        type: toVariableType(match[2]),
      });
    }
  }
}

function replaceVariables(value: string, variables: Record<string, string>): string {
  return value.replace(variablePattern(), (_match, name: string) => variables[name] ?? "");
}

function variablePattern(): RegExp {
  return /{{\s*([A-Za-z0-9_.-]+)(?::(string|datetime))?\s*}}/g;
}

function toVariableType(value: string | undefined): VariableType {
  if (value === "datetime") {
    return "datetime";
  }
  return "string";
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(",")}}`;
}
