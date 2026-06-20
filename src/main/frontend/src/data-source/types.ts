export type AuthenticationConfig =
  | { type: "none" }
  | { type: "bearer_token"; value: string }
  | { type: "api_key_header"; headerName: string; value: string };

export interface RestApiSourceConfig {
  baseUrl: string;
  authentication: AuthenticationConfig;
}

export interface DataSourceReference {
  dashboardId: string;
  dashboardName: string;
  widgetId: string;
  widgetTitle: string;
}

export interface DataSource {
  id: string;
  name: string;
  type: "rest";
  config: RestApiSourceConfig;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DataSourceInput {
  name: string;
  type: "rest";
  config: RestApiSourceConfig;
}
