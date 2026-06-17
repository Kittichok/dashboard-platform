import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getDashboard } from "../dashboard/dashboardApi";
import type { ApiFailure, Dashboard, NetworkFailure } from "../dashboard/types";
import { Icon } from "../dashboard/icons";
import { fetchWidgetData, listWidgets } from "./widgetApi";
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
  const [dataLoading, setDataLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ViewerError | null>(null);

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

  useEffect(() => {
    if (!id || widgets.length === 0) return;
    let cancelled = false;
    setDataLoading(true);
    (async () => {
      const results: Record<string, WidgetFetchResult> = {};
      await Promise.all(widgets.map(async (w) => {
        if (!w.dataSource) return;
        results[w.id] = await fetchWidgetData(id, w.id);
      }));
      if (!cancelled) {
        setWidgetData(results);
        setDataLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, widgets]);

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
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">DP</span>
          <span>
            <strong>Dashboard</strong>
            <small>Platform</small>
          </span>
        </div>
        <nav aria-label="Workspace">
          <p className="nav-label">Workspace</p>
          <Link to="/" className="nav-item" style={{ textDecoration: "none" }}>
            <Icon name="dashboard" />
            Dashboard Library
          </Link>
        </nav>
        <div className="sidebar-footer">
          <span className="network-dot" />
          <div>
            <strong>Private workspace</strong>
            <small>Shared visitor access</small>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="page-header">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>{dashboard?.name ?? "Dashboard"}</h1>
          </div>
          <Link to={`/dashboards/${id}`} className="button primary" style={{ textDecoration: "none" }}>
            <Icon name="edit" /> Edit Dashboard
          </Link>
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
                <WidgetRenderer widget={widget} fetchData={widgetData[widget.id]} />
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
