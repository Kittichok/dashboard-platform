import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getDashboard } from "../dashboard/dashboardApi";
import type { ApiFailure, Dashboard, NetworkFailure } from "../dashboard/types";
import { Icon } from "../dashboard/icons";
import { addWidget, listWidgets, removeWidget, updateWidget } from "./widgetApi";
import { WidgetAddDialog } from "./WidgetAddDialog";
import { WidgetEditPanel } from "./WidgetEditPanel";
import { WidgetRenderer } from "./WidgetRenderer";
import type { Widget, WidgetInput } from "./types";

type EditorError = {
  message: string;
  detail?: string;
  status?: number;
  code?: string;
};

function errToEditorError(failure: ApiFailure | NetworkFailure, fallback: string): EditorError {
  if (failure.kind === "api") {
    return {
      message: failure.message || fallback,
      detail: `Status ${failure.status} · ${failure.code}`,
      status: failure.status,
      code: failure.code,
    };
  }
  return { message: failure.message || fallback, detail: "Network error" };
}

export function DashboardEditor() {
  const { id } = useParams<{ id: string }>();
  const gridRef = useRef<HTMLElement>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<EditorError | null>(null);
  const [conflict, setConflict] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addFieldErrors, setAddFieldErrors] = useState<Record<string, string>>({});
  const [addOperationMessage, setAddOperationMessage] = useState<string | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});
  const [editOperationMessage, setEditOperationMessage] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    widgetId: string;
    origX: number;
    origY: number;
    startX: number;
    startY: number;
    dx: number;
    dy: number;
  } | null>(null);

  const selectedWidget = widgets.find((widget) => widget.id === selectedWidgetId) ?? null;

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
      const failure = err as ApiFailure | NetworkFailure;
      if (failure.kind === "api" && failure.status === 409) {
        setConflict(true);
      } else {
        setError(errToEditorError(failure, "Failed to load dashboard."));
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function handleDragStart(e: React.PointerEvent, widget: Widget) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    e.preventDefault();
    setDragState({
      widgetId: widget.id,
      origX: widget.x,
      origY: widget.y,
      startX: e.clientX,
      startY: e.clientY,
      dx: 0,
      dy: 0,
    });
  }

  function handleDragMove(e: React.PointerEvent) {
    if (!dragState) return;
    setDragState((prev) => prev ? { ...prev, dx: e.clientX - prev.startX, dy: e.clientY - prev.startY } : null);
  }

  async function handleDragEnd() {
    if (!dragState || !id || !dashboard || !gridRef.current) { setDragState(null); return; }
    const widget = widgets.find((w) => w.id === dragState.widgetId);
    if (!widget) { setDragState(null); return; }

    const rect = gridRef.current.getBoundingClientRect();
    const gap = 16;
    const colWidth = (rect.width - 11 * gap) / 12;
    const rowHeight = 100;
    const colDelta = Math.round(dragState.dx / (colWidth + gap));
    const rowDelta = Math.round(dragState.dy / (rowHeight + gap));
    const newX = Math.max(0, Math.min(11 - widget.w + 1, dragState.origX + colDelta));
    const newY = Math.max(0, dragState.origY + rowDelta);

    setDragState(null);

    if (newX === dragState.origX && newY === dragState.origY) return;

    try {
      const updated = await updateWidget(id, widget.id, dashboard.version, {
        title: widget.title,
        type: widget.type,
        x: newX,
        y: newY,
        w: widget.w,
        h: widget.h,
        displayConfig: widget.displayConfig,
        dataSource: widget.dataSource,
      });
      setDashboard((prev) => prev ? { ...prev, version: prev.version + 1 } : null);
      setWidgets((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (err: unknown) {
      const failure = err as ApiFailure | NetworkFailure;
      if (failure.kind === "api" && failure.status === 409) {
        setConflict(true);
      } else {
        setError(errToEditorError(failure, "Failed to move widget."));
      }
    }
  }

  async function handleDelete(widgetId: string) {
    if (!id || !dashboard) return;
    const confirmed = window.confirm("Delete this widget?");
    if (!confirmed) return;
    try {
      await removeWidget(id, widgetId, dashboard.version);
      setDashboard((prev) => prev ? { ...prev, version: prev.version + 1 } : null);
      setWidgets((current) => current.filter((w) => w.id !== widgetId));
      if (selectedWidgetId === widgetId) {
        setSelectedWidgetId(null);
      }
    } catch (err: unknown) {
      const failure = err as ApiFailure | NetworkFailure;
      if (failure.kind === "api" && failure.status === 409) {
        setConflict(true);
      } else {
        setError(errToEditorError(failure, "Failed to delete widget."));
      }
    }
  }

  async function handleAddWidget(input: WidgetInput) {
    if (!id || !dashboard) return;
    setAddFieldErrors({});
    setAddOperationMessage(null);
    try {
      const widget = await addWidget(id, dashboard.version, input);
      setDashboard((prev) => prev ? { ...prev, version: prev.version + 1 } : null);
      setWidgets((current) => [...current, widget]);
      setShowAddDialog(false);
    } catch (err: unknown) {
      const failure = err as ApiFailure | NetworkFailure;
      if (failure.kind === "api" && failure.status === 409) {
        setConflict(true);
      } else if (failure.kind === "api" && failure.code === "validation_error") {
        setAddFieldErrors(failure.fieldErrors ?? {});
        setAddOperationMessage(failure.message ?? "Validation failed.");
      } else {
        setError(errToEditorError(failure, "Failed to add widget."));
      }
    }
  }

  async function handleUpdateWidget(widget: Widget, input: WidgetInput) {
    if (!id || !dashboard) return;
    setEditFieldErrors({});
    setEditOperationMessage(null);
    try {
      const updated = await updateWidget(id, widget.id, dashboard.version, input);
      setDashboard((prev) => prev ? { ...prev, version: prev.version + 1 } : null);
      setWidgets((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelectedWidgetId(null);
    } catch (err: unknown) {
      const failure = err as ApiFailure | NetworkFailure;
      if (failure.kind === "api" && failure.status === 409) {
        setConflict(true);
      } else if (failure.kind === "api" && failure.code === "validation_error") {
        setEditFieldErrors(failure.fieldErrors ?? {});
        setEditOperationMessage(failure.message ?? "Validation failed.");
      } else {
        setError(errToEditorError(failure, "Failed to update widget."));
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
          <div style={{ display: "flex", gap: "8px" }}>
            <Link to={`/dashboards/${id}/view`} className="button secondary" style={{ textDecoration: "none" }}>
              <Icon name="dashboard" /> View
            </Link>
            <button type="button" className="button primary" onClick={() => { setAddFieldErrors({}); setAddOperationMessage(null); setShowAddDialog(true); }}>
              <Icon name="plus" /> Add Widget
            </button>
          </div>
        </header>

        {conflict ? (
          <div className="notice" role="alert">
            <span>The dashboard changed after it was loaded. <Link to={`/dashboards/${id}`}>Reload</Link></span>
          </div>
        ) : null}

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
          ref={gridRef}
          className="widget-grid"
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={() => setDragState(null)}
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
              <p>Add a widget to get started.</p>
            </div>
          ) : (
            widgets.map((widget) => {
              const isDragging = dragState?.widgetId === widget.id;
              return (
                <article
                  key={widget.id}
                  className={`dashboard-card${isDragging ? " dragging" : ""}`}
                  onClick={() => {
                    if (isDragging) return;
                    setEditFieldErrors({});
                    setEditOperationMessage(null);
                    setSelectedWidgetId(widget.id);
                  }}
                  onPointerDown={(e) => handleDragStart(e, widget)}
                  style={{
                    gridColumn: `${widget.x + 1} / span ${widget.w}`,
                    gridRow: `${widget.y + 1} / span ${widget.h}`,
                    padding: "16px",
                    cursor: "grab",
                    touchAction: "none",
                    transform: isDragging ? `translate(${dragState.dx}px, ${dragState.dy}px)` : undefined,
                    zIndex: isDragging ? 100 : undefined,
                    opacity: dragState && !isDragging ? 0.3 : undefined,
                    transition: isDragging ? "none" : undefined,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h3 style={{ margin: 0, fontSize: "14px" }}>{widget.title}</h3>
                    {dashboard && (
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Configure ${widget.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditFieldErrors({});
                            setEditOperationMessage(null);
                            setSelectedWidgetId(widget.id);
                          }}
                        >
                          ⚙
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label="Delete widget"
                          onClick={(e) => { e.stopPropagation(); handleDelete(widget.id); }}
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                  <WidgetRenderer widget={widget} />
                </article>
              );
            })
          )}
        </section>
      </main>

      {showAddDialog ? (
        <WidgetAddDialog
          fieldErrors={addFieldErrors}
          operationMessage={addOperationMessage}
          onClose={() => setShowAddDialog(false)}
          onSubmit={handleAddWidget}
          existingWidgets={widgets}
        />
      ) : null}

      {id && selectedWidget ? (
        <WidgetEditPanel
          dashboardId={id}
          widget={selectedWidget}
          fieldErrors={editFieldErrors}
          operationMessage={editOperationMessage}
          onClose={() => setSelectedWidgetId(null)}
          onSubmit={(input) => handleUpdateWidget(selectedWidget, input)}
        />
      ) : null}
    </div>
  );
}
