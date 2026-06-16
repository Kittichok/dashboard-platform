import type { Dashboard } from "./types";
import { Icon } from "./icons";

type DashboardCardProps = {
  dashboard: Dashboard;
  index: number;
  onRename: (dashboard: Dashboard) => void;
  onDuplicate: (dashboard: Dashboard) => void;
  onDelete: (dashboard: Dashboard) => void;
};

export function DashboardCard({
  dashboard,
  index,
  onRename,
  onDuplicate,
  onDelete
}: DashboardCardProps) {
  return (
    <article className="dashboard-card">
      <div className="card-main">
        <span className={`card-visual visual-${index % 4}`}>
          <span />
          <span />
          <span />
        </span>
        <div className="card-content">
          <h2>{dashboard.name}</h2>
          <p>{dashboard.description || "No description yet."}</p>
          <span className="card-meta">
            Version {dashboard.version} · {dashboard.widgets.length} widgets
          </span>
          <div className="card-actions" aria-label={`${dashboard.name} actions`}>
            <button type="button" className="button secondary" onClick={() => onRename(dashboard)}>
              <Icon name="edit" /> Rename
            </button>
            <button type="button" className="button secondary" onClick={() => onDuplicate(dashboard)}>
              <Icon name="copy" /> Duplicate
            </button>
            <button type="button" className="button danger" onClick={() => onDelete(dashboard)}>
              <Icon name="trash" /> Delete
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
