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

function isSelectedRestDataSource(dataSource: DataSource | null): dataSource is Extract<DataSource, { kind: "rest" }> {
  return Boolean(dataSource && "kind" in dataSource && dataSource.kind === "rest");
}

function isLegacyRestDataSource(dataSource: DataSource | null): dataSource is Extract<DataSource, { type: "rest" }> {
  return Boolean(dataSource && "type" in dataSource && dataSource.type === "rest");
}

export async function runWidgetRequests({
  dashboardId,
  widgets,
  variables = {},
  fetchWidgetData = defaultFetchWidgetData,
  onWidgetResult
}: RunWidgetRequestsInput): Promise<Record<string, WidgetFetchResult>> {
  const results: Record<string, WidgetFetchResult> = {};
  const runtimeVariables = { ...variables };
  const pending = widgets.filter((widget) => widget.dataSource);

  while (pending.length > 0) {
    const runnableEntries = pending
      .filter((widget) => canResolveWidget(widget, runtimeVariables))
      .map((widget) => ({
        widget,
        dataSource: resolveDataSourceVariables(widget.dataSource, runtimeVariables),
      }));

    if (runnableEntries.length === 0) {
      for (const blocked of pending) {
        results[blocked.id] = { ok: false, status: 424 };
        onWidgetResult?.(blocked.id, results[blocked.id]);
      }
      break;
    }

    const groups = new Map<string, Array<{ widget: Widget; dataSource: Widget["dataSource"] }>>();
    for (const entry of runnableEntries) {
      const key = stableStringify(entry.dataSource);
      groups.set(key, [...(groups.get(key) ?? []), entry]);
    }

    await Promise.all(
      Array.from(groups.values()).map(async (group) => {
        const representative = group[0];
        const result = await fetchWidgetData(
          dashboardId,
          representative.widget.id,
          representative.dataSource ?? undefined
        );
        for (const entry of group) {
          results[entry.widget.id] = result;
          onWidgetResult?.(entry.widget.id, result);
          if (result.ok) {
            applyResponseBindings(entry.widget.dataSource, result.data, runtimeVariables);
          }
        }
      })
    );

    const runnableIds = new Set(runnableEntries.map((entry) => entry.widget.id));
    for (let i = pending.length - 1; i >= 0; i -= 1) {
      if (runnableIds.has(pending[i].id)) {
        pending.splice(i, 1);
      }
    }
  }

  return results;
}

export function extractDataSourceVariables(widgets: Widget[]): DataSourceVariable[] {
  const names = new Map<string, DataSourceVariable>();
  for (const widget of widgets) {
    const source = widget.dataSource;
    if (!source) {
      continue;
    }
    if (isSelectedRestDataSource(source)) {
      collectVariables(source.request.path, names);
      Object.entries(source.request.headers).forEach(([key, value]) => {
        collectVariables(key, names);
        collectVariables(value, names);
      });
      if (source.request.body) {
        collectVariables(source.request.body, names);
      }
      continue;
    }
    if (isLegacyRestDataSource(source)) {
      collectVariables(source.url, names);
      Object.entries(source.headers).forEach(([key, value]) => {
        collectVariables(key, names);
        collectVariables(value, names);
      });
      if (source.body) {
        collectVariables(source.body, names);
      }
    }
  }
  return Array.from(names.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function resolveDataSourceVariables(dataSource: Widget["dataSource"], variables: Record<string, string>): Widget["dataSource"] {
  if (!dataSource) {
    return dataSource;
  }
  if (isSelectedRestDataSource(dataSource)) {
    return {
      ...dataSource,
      request: {
        ...dataSource.request,
        path: replaceVariables(dataSource.request.path, variables),
        headers: Object.fromEntries(
          Object.entries(dataSource.request.headers).map(([key, value]) => [
            replaceVariables(key, variables),
            replaceVariables(value, variables)
          ])
        ),
        body: dataSource.request.body === null ? null : replaceVariables(dataSource.request.body, variables)
      }
    };
  }
  if (!isLegacyRestDataSource(dataSource)) {
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

function applyResponseBindings(
  dataSource: Widget["dataSource"],
  data: unknown,
  variables: Record<string, string>
) {
  if (!isRestSourceWithBindings(dataSource)) {
    return;
  }
  for (const binding of dataSource.responseBindings ?? []) {
    if (!isValidBindingVariable(binding.variable)) {
      continue;
    }
    const value = readJsonPath(data, binding.jsonPath);
    if (typeof value === "string" && value.length > 0) {
      variables[binding.variable] = value;
    }
  }
}

function canResolveWidget(widget: Widget, variables: Record<string, string>): boolean {
  if (!widget.dataSource) {
    return false;
  }
  const requiredVariables = extractRequiredVariableNames(widget.dataSource);
  return requiredVariables.every((name) => Object.prototype.hasOwnProperty.call(variables, name));
}

function extractRequiredVariableNames(dataSource: Widget["dataSource"]): string[] {
  if (!dataSource) {
    return [];
  }
  const names = new Set<string>();

  const collect = (value: string) => {
    for (const match of value.matchAll(variablePattern())) {
      names.add(match[1]);
    }
  };

  if (isSelectedRestDataSource(dataSource)) {
    collect(dataSource.request.path);
    Object.entries(dataSource.request.headers).forEach(([key, value]) => {
      collect(key);
      collect(value);
    });
    if (dataSource.request.body) {
      collect(dataSource.request.body);
    }
  } else if (isLegacyRestDataSource(dataSource)) {
    collect(dataSource.url);
    Object.entries(dataSource.headers).forEach(([key, value]) => {
      collect(key);
      collect(value);
    });
    if (dataSource.body) {
      collect(dataSource.body);
    }
  }

  return Array.from(names);
}

function isRestSourceWithBindings(
  dataSource: Widget["dataSource"]
): dataSource is Extract<DataSource, { kind: "rest" } | { type: "rest" }> {
  return Boolean(dataSource && (("kind" in dataSource && dataSource.kind === "rest") || ("type" in dataSource && dataSource.type === "rest")));
}

function isValidBindingVariable(name: string): boolean {
  return /^[A-Za-z0-9_.-]+$/.test(name);
}

function readJsonPath(data: unknown, jsonPath: string): unknown {
  if (!jsonPath) {
    return undefined;
  }
  const segments = tokenizeJsonPath(jsonPath);
  if (segments.length === 0) {
    return undefined;
  }

  let current: unknown = data;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
      continue;
    }
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function tokenizeJsonPath(path: string): string[] {
  const matches = path.matchAll(/([A-Za-z0-9_-]+)|\[(\d+)\]/g);
  const segments: string[] = [];
  for (const match of matches) {
    if (match[1]) {
      segments.push(match[1]);
    } else if (match[2]) {
      segments.push(match[2]);
    }
  }
  return segments;
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
