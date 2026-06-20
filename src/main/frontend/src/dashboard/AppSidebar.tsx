import { Link } from "react-router-dom";

import { Icon } from "./icons";

type AppSidebarProps = {
  collapsed: boolean;
  activeItem?: "library" | "data-sources";
  onToggle: () => void;
};

export function AppSidebar({ collapsed, activeItem, onToggle }: AppSidebarProps) {
  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="brand">
        <span className="brand-mark">DP</span>
        <span className="brand-text">
          <strong>Dashboard</strong>
          <small>Platform</small>
        </span>
        <button
          type="button"
          className="sidebar-toggle"
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}
          onClick={onToggle}
        >
          <Icon name={collapsed ? "expand" : "collapse"} />
        </button>
      </div>
      <nav aria-label="Workspace">
        <p className="nav-label">Workspace</p>
        <Link
          to="/"
          className={`nav-item${activeItem === "library" ? " active" : ""}`}
          aria-label="Dashboard Library"
          title={collapsed ? "Dashboard Library" : undefined}
          style={{ textDecoration: "none" }}
        >
          <Icon name="dashboard" />
          <span className="nav-text">Dashboard Library</span>
        </Link>
        <Link
          to="/data-sources"
          className={`nav-item${activeItem === "data-sources" ? " active" : ""}`}
          aria-label="Data Source Library"
          title={collapsed ? "Data Source Library" : undefined}
          style={{ textDecoration: "none" }}
        >
          <Icon name="database" />
          <span className="nav-text">Data Source Library</span>
        </Link>
      </nav>
      <div className="sidebar-footer">
        <span className="network-dot" />
        <div className="footer-text">
          <strong>Private workspace</strong>
          <small>Shared visitor access</small>
        </div>
      </div>
    </aside>
  );
}
