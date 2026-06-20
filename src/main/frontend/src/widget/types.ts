export type WidgetType = 'table' | 'chart' | 'metric' | 'text' | 'raw_json' | 'json_preview';

export type VariableType = 'string' | 'datetime';

export interface DataSourceVariable {
  name: string;
  type: VariableType;
}

export type WidgetFetchResult =
  | { ok: true; data: unknown }
  | { ok: false; status: number };

export interface LegacyRestDataSource {
  type: 'rest';
  url: string;
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body: string | null;
}

export interface WidgetRestRequest {
  path: string;
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body: string | null;
}

export interface SelectedRestDataSource {
  kind: 'rest';
  dataSourceId: string;
  request: WidgetRestRequest;
}

export interface TableDataSource {
  type: 'table';
  table: string;
  columns: string[];
  limit: number | null;
}

export type DataSource = SelectedRestDataSource | LegacyRestDataSource | TableDataSource;

export interface Widget {
  id: string;
  title: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  displayConfig: Record<string, unknown> | null;
  dataSource: DataSource | null;
}

export interface WidgetInput {
  title: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  displayConfig?: Record<string, unknown> | null;
  dataSource?: DataSource | null;
}
