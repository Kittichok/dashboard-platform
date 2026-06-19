export type Dashboard = {
  id: string;
  name: string;
  description: string;
  widgets: Array<Record<string, unknown>>;
  variableState?: Record<string, string>;
  version: number;
  createdAt?: string;
  updatedAt?: string;
};

export type DashboardInput = {
  name: string;
  description: string;
};

export type ApiFailure = {
  kind: "api";
  status: number;
  code: string;
  message: string;
  fieldErrors: Record<string, string>;
};

export type NetworkFailure = {
  kind: "network";
  message: string;
};

export type DashboardFailure = ApiFailure | NetworkFailure;
