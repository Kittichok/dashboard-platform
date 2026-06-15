import { dashboards, dataSources } from "./data.mjs";
import {
  cancelDraft,
  commitVariableValues,
  createInitialState,
  filterDashboards,
  startDraft
} from "./model.mjs";

const app = document.querySelector("#app");
let state = createInitialState();
let librarySearch = "";

const icon = (name) => {
  const paths = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    source: '<path d="M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Z"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="m9 18 6-6-6-6"/>',
    dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    check: '<path d="m5 12 4 4L19 6"/>'
  };
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
};

function currentDashboard() {
  return state.editing ? state.draft : state.activeDashboard;
}

function sidebar() {
  return `
    <aside class="sidebar">
      <button class="brand" data-action="library" aria-label="Dashboard Platform home">
        <span class="brand-mark">DP</span>
        <span><strong>Dashboard</strong><small>Platform</small></span>
      </button>
      <nav aria-label="Workspace">
        <p class="nav-label">Workspace</p>
        <button class="nav-item ${state.screen === "library" ? "active" : ""}" data-action="library">
          ${icon("dashboard")}<span>Dashboard Library</span>
        </button>
        <button class="nav-item" data-action="sources">
          ${icon("source")}<span>Data Source Library</span>
        </button>
      </nav>
      <div class="sidebar-footer">
        <span class="network-dot"></span>
        <div><strong>Private workspace</strong><small>Shared visitor access</small></div>
      </div>
    </aside>
  `;
}

function shell(content) {
  return `${sidebar()}<main class="main">${content}</main>${renderDialog()}${renderToast()}`;
}

function renderLibrary() {
  const visibleDashboards = filterDashboards(dashboards, librarySearch);
  return shell(`
    <header class="page-header">
      <div>
        <p class="eyebrow">Workspace</p>
        <h1>Dashboard Library</h1>
        <p class="page-copy">Create, open, and manage dashboards shared by every visitor.</p>
      </div>
      <button class="button primary" data-action="create-dashboard">${icon("plus")} New dashboard</button>
    </header>
    <section class="library-toolbar" aria-label="Dashboard tools">
      <label class="search-field">
        ${icon("search")}
        <input id="library-search" type="search" value="${librarySearch}" placeholder="Search dashboards">
      </label>
      <span class="result-count">${visibleDashboards.length} dashboards</span>
    </section>
    <section class="dashboard-grid" aria-live="polite">
      ${visibleDashboards.map((dashboard, index) => `
        <article class="dashboard-card">
          <button class="card-main" data-action="open-dashboard" data-id="${dashboard.id}">
            <span class="card-visual visual-${index % 4}">
              <span></span><span></span><span></span>
            </span>
            <span class="card-content">
              <span class="card-heading">
                <strong>${dashboard.name}</strong>
                <span class="card-arrow">${icon("arrow")}</span>
              </span>
              <span class="card-description">${dashboard.description}</span>
              <span class="card-meta">${dashboard.updated} · ${dashboard.widgets.length || index + 3} widgets</span>
            </span>
          </button>
          <button class="icon-button card-menu" aria-label="Dashboard actions" data-action="dashboard-menu" data-id="${dashboard.id}">
            ${icon("dots")}
          </button>
        </article>
      `).join("") || `<div class="empty-state"><h2>No dashboards found</h2><p>Try a different search.</p></div>`}
    </section>
  `);
}

function variableControls(dashboard) {
  return dashboard.variables.map((variable) => `
    <label class="variable-field ${variable.required && !state.variableValues[variable.name] ? "invalid" : ""}">
      <span>${variable.label}${variable.required ? " *" : ""}</span>
      <input
        type="${variable.type === "date" ? "date" : "text"}"
        data-variable="${variable.name}"
        value="${state.variableValues[variable.name] ?? ""}"
      >
    </label>
  `).join("");
}

function renderWidget(widget) {
  const selected = state.editing && state.selectedWidgetId === widget.id;
  const editorControls = state.editing ? `
    <div class="widget-editor-controls">
      <span class="drag-handle" title="Reposition widget">${icon("grip")}</span>
      <button class="icon-button" aria-label="Widget actions">${icon("dots")}</button>
    </div>
  ` : "";

  let body = "";
  if (!state.hasSearched) {
    body = `<div class="widget-empty"><span class="empty-symbol">${icon("search")}</span><strong>Ready to load</strong><p>Click Search to request data for this widget.</p></div>`;
  } else if (widget.type === "table") {
    body = `
      <div class="table-tools">
        <label>${icon("search")}<input placeholder="Filter loaded rows"></label>
        <span>${widget.rows.length} records</span>
      </div>
      <div class="table-scroll">
        <table>
          <thead><tr>${widget.columns.map((column) => `<th>${column}</th>`).join("")}</tr></thead>
          <tbody>${widget.rows.map((row) => `<tr>${row.map((cell, index) => `<td>${index === 2 ? `<span class="severity ${cell.toLowerCase()}">${cell}</span>` : cell}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </div>`;
  } else if (widget.type === "text") {
    body = `<div class="metric-grid">${widget.values.map(([label, value], index) => `
      <div class="metric"><span>${label}</span><strong class="${index === 0 ? "status-value" : ""}">${value}</strong></div>
    `).join("")}</div>`;
  } else if (widget.type === "raw") {
    body = `<pre class="json-code">${escapeHtml(widget.value)}</pre>`;
  } else {
    body = `
      <label class="tree-search">${icon("search")}<input placeholder="Search keys and values"></label>
      <div class="json-tree">
        <div class="tree-root"><span class="tree-toggle">⌄</span><strong>{ }</strong> response</div>
        ${widget.tree.map(([key, value]) => `<div class="tree-row"><span class="tree-line"></span><span class="tree-key">${key}</span><span class="tree-value">"${value}"</span></div>`).join("")}
      </div>`;
  }

  return `
    <article class="widget widget-${widget.type} ${selected ? "selected" : ""}" data-action="${state.editing ? "select-widget" : ""}" data-id="${widget.id}">
      <header class="widget-header">
        <div><h2>${widget.title}</h2><p>${widget.subtitle}</p></div>
        ${editorControls}
      </header>
      <div class="widget-body">${state.refreshing ? `<div class="loading-bar"></div>` : ""}${body}</div>
    </article>
  `;
}

function renderDashboard() {
  const dashboard = currentDashboard();
  return shell(`
    <div class="dashboard-page ${state.editing ? "edit-layout" : ""}">
      <section class="dashboard-canvas">
        <header class="dashboard-header">
          <button class="back-link" data-action="library">${icon("chevron")} Dashboard Library</button>
          <div class="dashboard-title-row">
            <div>
              <div class="title-with-state">
                <h1>${dashboard.name}</h1>
                ${state.editing ? `<span class="draft-badge">Dashboard Draft</span>` : ""}
              </div>
              <p>${dashboard.description}</p>
            </div>
            <div class="header-actions">
              ${state.editing ? `
                <button class="button secondary" data-action="cancel-edit">Cancel</button>
                <button class="button primary" data-action="save-edit">${icon("check")} Save dashboard</button>
              ` : `
                <button class="button secondary" data-action="refresh" ${!state.hasSearched ? "disabled" : ""}>${icon("refresh")} Refresh</button>
                <button class="button secondary" data-action="edit">${icon("edit")} Edit Mode</button>
              `}
            </div>
          </div>
        </header>
        <section class="variables-bar">
          <div class="variables-fields">${variableControls(dashboard)}</div>
          <button class="button primary search-button" data-action="search">${icon("search")} Search</button>
        </section>
        ${state.editing ? `
          <div class="edit-toolbar">
            <div><strong>Edit Mode</strong><span>Reposition, resize, and configure widgets.</span></div>
            <button class="button secondary" data-action="add-widget">${icon("plus")} Add widget</button>
          </div>
        ` : ""}
        <section class="widget-grid">
          ${dashboard.widgets.map(renderWidget).join("")}
        </section>
      </section>
      ${state.editing ? renderInspector(dashboard) : ""}
    </div>
  `);
}

function renderInspector(dashboard) {
  const selected = dashboard.widgets.find((widget) => widget.id === state.selectedWidgetId);
  return `
    <aside class="inspector">
      <header><div><p class="eyebrow">Edit Mode</p><h2>Variables Panel</h2></div><button class="icon-button" data-action="close-inspector" aria-label="Close panel">${icon("close")}</button></header>
      <p class="inspector-copy">Dashboard variables can be reused by widget requests.</p>
      <div class="variable-list">
        ${dashboard.variables.map((variable, index) => `
          <button class="variable-row">
            <span class="variable-order">${index + 1}</span>
            <span><strong>${variable.label}</strong><small>{{${variable.name}}} · ${variable.type}${variable.required ? " · required" : ""}</small></span>
            ${icon("dots")}
          </button>
        `).join("")}
      </div>
      <button class="button secondary full-width" data-action="add-variable">${icon("plus")} Add dashboard variable</button>
      <div class="inspector-divider"></div>
      <div class="selected-summary">
        <p class="eyebrow">Selected widget</p>
        ${selected ? `<h3>${selected.title}</h3><p>${selected.type === "preview" ? "JSON Preview" : `${selected.type[0].toUpperCase()}${selected.type.slice(1)}`} Widget</p><button class="button tertiary full-width">Configure widget</button>` : `<p>Select a widget to inspect it.</p>`}
      </div>
    </aside>
  `;
}

function renderSources() {
  return shell(`
    <header class="page-header">
      <div><p class="eyebrow">Workspace</p><h1>Data Source Library</h1><p class="page-copy">Reusable REST API sources available to every dashboard.</p></div>
      <button class="button primary" data-action="source-dialog">${icon("plus")} New data source</button>
    </header>
    <section class="source-list">
      ${dataSources.map((source) => `<article><span class="source-icon">${icon("source")}</span><div><h2>${source.name}</h2><p>${source.detail}</p></div><span class="source-type">REST API Source</span><button class="icon-button">${icon("dots")}</button></article>`).join("")}
    </section>
  `);
}

function renderDialog() {
  if (!state.dialog) return "";
  const content = {
    "create-dashboard": ["Create dashboard", "Name your new workspace dashboard.", "Dashboard name"],
    "dashboard-menu": ["Dashboard actions", "Rename, duplicate, or delete this dashboard.", ""],
    "add-widget": ["Add widget", "Choose a visualization for the dashboard draft.", ""],
    "add-variable": ["Add dashboard variable", "Configure a reusable dashboard input.", "Variable name"],
    "source-dialog": ["Create REST API Source", "Add a reusable source for widget requests.", "Source name"]
  }[state.dialog];

  return `
    <div class="dialog-backdrop" data-action="close-dialog">
      <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <button class="icon-button dialog-close" data-action="close-dialog" aria-label="Close">${icon("close")}</button>
        <p class="eyebrow">Prototype action</p>
        <h2 id="dialog-title">${content[0]}</h2>
        <p>${content[1]}</p>
        ${state.dialog === "dashboard-menu" ? `
          <div class="action-list"><button>Rename dashboard</button><button>Duplicate dashboard</button><button class="danger">Delete dashboard</button></div>
        ` : state.dialog === "add-widget" ? `
          <div class="widget-options"><button>Table Widget</button><button>Text Widget</button><button>Raw JSON Widget</button><button>JSON Preview Widget</button></div>
        ` : `
          <label class="dialog-field"><span>${content[2]}</span><input placeholder="${content[2]}"></label>
          <button class="button primary full-width" data-action="mock-complete">Continue</button>
        `}
      </section>
    </div>
  `;
}

function renderToast() {
  return state.toast ? `<div class="toast">${icon("check")} ${state.toast}</div>` : "";
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function render() {
  if (state.screen === "library") app.innerHTML = renderLibrary();
  else if (state.screen === "sources") app.innerHTML = renderSources();
  else app.innerHTML = renderDashboard();
}

function showToast(message) {
  state.toast = message;
  render();
  window.setTimeout(() => {
    state.toast = null;
    render();
  }, 2200);
}

app.addEventListener("input", (event) => {
  if (event.target.id === "library-search") {
    librarySearch = event.target.value;
    render();
    document.querySelector("#library-search")?.focus();
  }
  if (event.target.dataset.variable) {
    state.variableValues[event.target.dataset.variable] = event.target.value;
  }
});

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "library") {
    state = { ...state, screen: "library", editing: false, draft: null };
  } else if (action === "sources") {
    state = { ...state, screen: "sources", editing: false, draft: null };
  } else if (action === "open-dashboard") {
    const dashboard = dashboards.find((item) => item.id === target.dataset.id);
    state = { ...state, screen: "dashboard", activeDashboard: structuredClone(dashboard) };
  } else if (action === "edit") {
    state = startDraft(state, state.activeDashboard);
  } else if (action === "cancel-edit") {
    state = cancelDraft(state);
  } else if (action === "save-edit") {
    state = { ...state, activeDashboard: structuredClone(state.draft), editing: false, draft: null, selectedWidgetId: null };
    showToast("Dashboard draft saved");
    return;
  } else if (action === "search") {
    const missing = currentDashboard().variables.some((variable) => variable.required && !state.variableValues[variable.name]?.trim());
    if (missing) {
      showToast("Complete required dashboard variables");
      return;
    }
    state = { ...state, searchedValues: commitVariableValues(state.variableValues), hasSearched: true };
    window.history.replaceState({}, "", `?${new URLSearchParams(state.searchedValues)}`);
  } else if (action === "refresh") {
    state.refreshing = true;
    render();
    window.setTimeout(() => {
      state.refreshing = false;
      showToast("Widgets refreshed");
    }, 650);
    return;
  } else if (action === "select-widget") {
    state.selectedWidgetId = target.dataset.id;
  } else if (action === "close-inspector") {
    state.selectedWidgetId = null;
  } else if (["create-dashboard", "dashboard-menu", "add-widget", "add-variable", "source-dialog"].includes(action)) {
    state.dialog = action;
  } else if (action === "close-dialog") {
    if (event.target === target || target.closest(".dialog-close")) state.dialog = null;
    else return;
  } else if (action === "mock-complete") {
    state.dialog = null;
    showToast("Prototype action completed");
    return;
  }

  render();
});

render();

