import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  createDashboard,
  deleteDashboard,
  duplicateDashboard,
  listDashboards,
  renameDashboard
} from "./dashboardApi";
import { CreateDashboardDialog } from "./CreateDashboardDialog";
import { DashboardCard } from "./DashboardCard";
import { DeleteDashboardDialog } from "./DeleteDashboardDialog";
import { RenameDashboardDialog } from "./RenameDashboardDialog";
import { Icon } from "./icons";
import type { ApiFailure, Dashboard, DashboardFailure, DashboardInput } from "./types";

type DialogState =
  | { type: "create" }
  | { type: "rename"; dashboard: Dashboard }
  | { type: "delete"; dashboard: Dashboard }
  | null;

export function DashboardLibrary() {
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    listDashboards()
      .then((loaded) => {
        if (mounted) {
          setDashboards(loaded);
        }
      })
      .catch((error: DashboardFailure) => {
        if (mounted) {
          setNotice(error.message);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const visibleDashboards = useMemo(() => {
    const normalized = searchText.trim().toLowerCase();
    if (!normalized) {
      return dashboards;
    }
    return dashboards.filter((dashboard) =>
      `${dashboard.name} ${dashboard.description}`.toLowerCase().includes(normalized)
    );
  }, [dashboards, searchText]);

  function openDialog(nextDialog: DialogState) {
    setFieldErrors({});
    setOperationMessage(null);
    setDialog(nextDialog);
  }

  async function create(input: DashboardInput) {
    await runDialogMutation(async () => {
      const created = await createDashboard(input);
      setDashboards((current) => [created, ...current]);
      setDialog(null);
    });
  }

  async function rename(input: DashboardInput & { version: number }) {
    if (dialog?.type !== "rename") {
      return;
    }
    const dashboardId = dialog.dashboard.id;
    await runDialogMutation(async () => {
      const renamed = await renameDashboard(dashboardId, input);
      setDashboards((current) =>
        current.map((dashboard) => (dashboard.id === renamed.id ? renamed : dashboard))
      );
      setDialog(null);
    });
  }

  async function duplicate(dashboard: Dashboard) {
    try {
      const copy = await duplicateDashboard(dashboard.id);
      setDashboards((current) => [copy, ...current]);
    } catch (error) {
      setNotice(messageFor(error as DashboardFailure));
    }
  }

  async function remove() {
    if (dialog?.type !== "delete") {
      return;
    }
    const dashboard = dialog.dashboard;
    await runDialogMutation(async () => {
      await deleteDashboard(dashboard.id, dashboard.version);
      setDashboards((current) => current.filter((item) => item.id !== dashboard.id));
      setDialog(null);
    });
  }

  async function runDialogMutation(operation: () => Promise<void>) {
    setFieldErrors({});
    setOperationMessage(null);
    try {
      await operation();
    } catch (error) {
      const failure = error as DashboardFailure;
      if (failure.kind === "api" && failure.code === "validation_error") {
        setFieldErrors(failure.fieldErrors);
        setOperationMessage(failure.message);
      } else if (failure.kind === "api" && failure.code === "dashboard_version_conflict") {
        setOperationMessage(`${failure.message} Reload the dashboard library before retrying.`);
      } else {
        setNotice(messageFor(failure));
      }
    }
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
          <span className="nav-item active">
            <Icon name="dashboard" />
            Dashboard Library
          </span>
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
            <p className="eyebrow">Workspace</p>
            <h1>Dashboard Library</h1>
            <p className="page-copy">Create, search, and manage dashboards shared by every visitor.</p>
          </div>
          <button type="button" className="button primary" onClick={() => openDialog({ type: "create" })}>
            <Icon name="plus" /> New dashboard
          </button>
        </header>

        {notice ? (
          <div className="notice" role="alert">
            <span>{notice}</span>
            <button type="button" className="button secondary" onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </div>
        ) : null}

        <section className="library-toolbar" aria-label="Dashboard tools">
          <label className="search-field">
            <Icon name="search" />
            <span className="sr-only">Search dashboards</span>
            <input
              type="search"
              aria-label="Search dashboards"
              value={searchText}
              placeholder="Search dashboards"
              onChange={(event) => setSearchText(event.target.value)}
            />
          </label>
          <span className="result-count">{visibleDashboards.length} dashboards</span>
        </section>

        {loading ? (
          <div className="empty-state" role="status">
            Loading dashboards...
          </div>
        ) : dashboards.length === 0 ? (
          <div className="empty-state">
            <h2>No dashboards yet</h2>
            <p>Create the first workspace dashboard.</p>
          </div>
        ) : visibleDashboards.length === 0 ? (
          <div className="empty-state">
            <h2>No dashboards found</h2>
            <p>Try a different search.</p>
          </div>
        ) : (
          <section className="dashboard-grid" aria-live="polite">
            {visibleDashboards.map((dashboard, index) => (
              <DashboardCard
                key={dashboard.id}
                dashboard={dashboard}
                index={index}
                onClick={(item) => navigate(`/dashboards/${item.id}/view`)}
                onRename={(item) => openDialog({ type: "rename", dashboard: item })}
                onDuplicate={duplicate}
                onDelete={(item) => openDialog({ type: "delete", dashboard: item })}
              />
            ))}
          </section>
        )}
      </main>

      {dialog?.type === "create" ? (
        <CreateDashboardDialog
          fieldErrors={fieldErrors}
          operationMessage={operationMessage}
          onClose={() => setDialog(null)}
          onSubmit={create}
        />
      ) : null}
      {dialog?.type === "rename" ? (
        <RenameDashboardDialog
          dashboard={dialog.dashboard}
          fieldErrors={fieldErrors}
          operationMessage={operationMessage}
          onClose={() => setDialog(null)}
          onSubmit={rename}
        />
      ) : null}
      {dialog?.type === "delete" ? (
        <DeleteDashboardDialog
          dashboard={dialog.dashboard}
          operationMessage={operationMessage}
          onClose={() => setDialog(null)}
          onConfirm={remove}
        />
      ) : null}
    </div>
  );
}

function messageFor(failure: DashboardFailure) {
  if (failure.kind === "api") {
    return failure.message;
  }
  return failure.message || "Network request failed.";
}
