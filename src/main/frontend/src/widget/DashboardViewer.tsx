import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { AppSidebar } from "../dashboard/AppSidebar";
import { getDashboard } from "../dashboard/dashboardApi";
import type { ApiFailure, Dashboard, NetworkFailure } from "../dashboard/types";
import { Icon } from "../dashboard/icons";
import { listWidgets } from "./widgetApi";
import { extractDataSourceVariables, runWidgetRequests } from "./widgetRequestRunner";
import { WidgetRenderer } from "./WidgetRenderer";
import type { Widget, WidgetFetchResult } from "./types";

type ViewerError = {
  message: string;
  detail?: string;
};

function errToViewerError(failure: ApiFailure | NetworkFailure, fallback: string): ViewerError {
  if (failure.kind === "api") {
    return {
      message: failure.message || fallback,
      detail: `Status ${failure.status} · ${failure.code}`,
    };
  }
  return { message: failure.message || fallback, detail: "Network error" };
}

export function DashboardViewer() {
  const { id } = useParams<{ id: string }>();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [widgetData, setWidgetData] = useState<Record<string, WidgetFetchResult>>({});
  const [widgetLoading, setWidgetLoading] = useState<Record<string, boolean>>({});
  const [dataLoading, setDataLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ViewerError | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [dash, wids] = await Promise.all([
        getDashboard(id),
        listWidgets(id)
      ]);
      setDashboard(dash);
      setWidgets(wids);
    } catch (err: unknown) {
      const failure = err as ApiFailure | NetworkFailure;
      setError(errToViewerError(failure, "Failed to load dashboard."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const variables = useMemo(() => extractDataSourceVariables(widgets), [widgets]);

  const runRequests = useCallback(async () => {
    if (!id) {
      return;
    }

    const requestableWidgetIds = widgets
      .filter((widget) => widget.dataSource)
      .map((widget) => widget.id);
    const loadingState = Object.fromEntries(
      requestableWidgetIds.map((widgetId) => [widgetId, true])
    ) as Record<string, boolean>;

    setHasSearched(true);
    setDataLoading(requestableWidgetIds.length > 0);
    setWidgetLoading(loadingState);
    setWidgetData({});

    try {
      await runWidgetRequests({
        dashboardId: id,
        widgets,
        variables: variableValues,
        onWidgetResult: (widgetId, result) => {
          setWidgetData((current) => ({
            ...current,
            [widgetId]: result
          }));
          setWidgetLoading((current) => ({
            ...current,
            [widgetId]: false
          }));
        }
      });
    } finally {
      setDataLoading(false);
      setWidgetLoading({});
    }
  }, [id, variableValues, widgets]);

  if (loading) {
    return (
      <div className="app-shell">
        <main className="main">
          <div className="empty-state" role="status">Loading dashboard...</div>
        </main>
      </div>
    );
  }

  return (
    <div className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((current) => !current)}
      />
      <main className="main">
        <header className="page-header">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>{dashboard?.name ?? "Dashboard"}</h1>
          </div>
          <div className="header-actions">
            {variables.length > 0 ? (
              <div className="variable-inputs" aria-label="Dashboard variables">
                {variables.map((variable) => (
                  <label key={variable.name} className="variable-field">
                    <span>{variable.name}</span>
                    <input
                      type={variable.type === "datetime" ? "datetime-local" : "text"}
                      aria-label={`${variable.name} variable`}
                      value={variableValues[variable.name] ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        setVariableValues((current) => ({ ...current, [variable.name]: value }));
                      }}
                    />
                  </label>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              className="button primary"
              onClick={runRequests}
              disabled={dataLoading || widgets.length === 0}
            >
              <Icon name="search" /> Search
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={runRequests}
              disabled={dataLoading || !hasSearched || widgets.length === 0}
            >
              <Icon name="refresh" /> Refresh
            </button>
            <Link to={`/dashboards/${id}`} className="button secondary" style={{ textDecoration: "none" }}>
              <Icon name="edit" /> Edit Dashboard
            </Link>
          </div>
        </header>

        {error ? (
          <div className="notice" role="alert">
            <div>
              <strong>{error.message}</strong>
              {error.detail ? <br /> : null}
              {error.detail ? <small>{error.detail}</small> : null}
            </div>
            <button type="button" className="button secondary" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        ) : null}

        <section
          className="widget-grid"
          style={{
            display: "grid",
            gap: "16px",
            marginTop: "24px",
            gridTemplateColumns: "repeat(12, 1fr)"
          }}
        >
          {widgets.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
              <h2>No widgets yet</h2>
              <p>This dashboard has no widgets.</p>
            </div>
          ) : (
            widgets.map((widget) => (
              <article
                key={widget.id}
                className="dashboard-card"
                style={{
                  gridColumn: `${widget.x + 1} / span ${widget.w}`,
                  gridRow: `${widget.y + 1} / span ${widget.h}`,
                  padding: "16px",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "14px", marginBottom: "8px" }}>{widget.title}</h3>
                {widgetLoading[widget.id] ? (
                  <div className="widget-status" role="status">Loading...</div>
                ) : null}
                <div className="widget-content">
                  <WidgetRenderer widget={widget} fetchData={widgetData[widget.id]} />
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
