import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getDashboard } from "../dashboard/dashboardApi";
import type { Dashboard } from "../dashboard/types";
import { Icon } from "../dashboard/icons";
import { listWidgets, removeWidget } from "./widgetApi";
import type { Widget } from "./types";

export function DashboardEditor() {
  const { id } = useParams<{ id: string }>();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setConflict(false);
    try {
      const [dash, wids] = await Promise.all([
        getDashboard(id),
        listWidgets(id)
      ]);
      setDashboard(dash);
      setWidgets(wids);
    } catch (err: unknown) {
      const failure = err as { kind?: string; message?: string; status?: number };
      if (failure.kind === "api" && failure.status === 409) {
        setConflict(true);
      } else {
        setError(failure.message ?? "Failed to load dashboard.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(widgetId: string) {
    if (!id || !dashboard) return;
    const confirmed = window.confirm("Delete this widget?");
    if (!confirmed) return;
    try {
      await removeWidget(id, widgetId, dashboard.version);
      setWidgets((current) => current.filter((w) => w.id !== widgetId));
    } catch (err: unknown) {
      const failure = err as { kind?: string; message?: string; status?: number };
      if (failure.kind === "api" && failure.status === 409) {
        setConflict(true);
      } else {
        setError(failure.message ?? "Failed to delete widget.");
      }
    }
  }

  if (loading) {
    return (
      <div className="app-shell">
        <main className="main">
          <div className="empty-state" role="status">Loading editor...</div>
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
          <button type="button" className="button primary">
            <Icon name="plus" /> Add Widget
          </button>
        </header>

        {conflict ? (
          <div className="notice" role="alert">
            <span>The dashboard changed after it was loaded. <Link to={`/dashboards/${id}`}>Reload</Link></span>
          </div>
        ) : null}

        {error ? (
          <div className="notice" role="alert">
            <span>{error}</span>
            <button type="button" className="button secondary" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        ) : null}

        <section className="widget-grid" style={{
          display: "grid",
          gap: "16px",
          marginTop: "24px",
          gridTemplateColumns: "repeat(12, 1fr)"
        }}>
          {widgets.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
              <h2>No widgets yet</h2>
              <p>Add a widget to get started.</p>
            </div>
          ) : (
            widgets.map((widget) => (
              <div
                key={widget.id}
                className="dashboard-card"
                style={{
                  gridColumn: `${widget.x + 1} / span ${widget.w}`,
                  gridRow: `${widget.y + 1} / span ${widget.h}`,
                  padding: "16px",
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h3 style={{ margin: 0, fontSize: "14px" }}>{widget.title}</h3>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Delete widget"
                    onClick={(e) => { e.stopPropagation(); handleDelete(widget.id); }}
                  >
                    ×
                  </button>
                </div>
                <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: "12px" }}>
                  {widget.type} — {widget.w}×{widget.h}
                </p>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
