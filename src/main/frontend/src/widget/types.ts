export type WidgetType = 'table' | 'chart' | 'metric' | 'text';

export interface DataSource {
  type: 'rest';
  url: string;
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body: string | null;
}

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
  displayConfig?: Record<string, unknown>;
  dataSource?: DataSource;
}
