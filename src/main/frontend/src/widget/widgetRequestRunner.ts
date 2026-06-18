import { fetchWidgetData as defaultFetchWidgetData } from "./widgetApi";
import type { DataSource, Widget, WidgetFetchResult } from "./types";

type FetchWidgetData = (
  dashboardId: string,
  widgetId: string,
  dataSource?: DataSource
) => Promise<WidgetFetchResult>;

type RunWidgetRequestsInput = {
  dashboardId: string;
  widgets: Widget[];
  fetchWidgetData?: FetchWidgetData;
  onWidgetResult?: (widgetId: string, result: WidgetFetchResult) => void;
};

export async function runWidgetRequests({
  dashboardId,
  widgets,
  fetchWidgetData = defaultFetchWidgetData,
  onWidgetResult
}: RunWidgetRequestsInput): Promise<Record<string, WidgetFetchResult>> {
  const results: Record<string, WidgetFetchResult> = {};
  const groups = new Map<string, Widget[]>();

  for (const widget of widgets) {
    if (!widget.dataSource) {
      continue;
    }
    const key = stableStringify(widget.dataSource);
    groups.set(key, [...(groups.get(key) ?? []), widget]);
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
