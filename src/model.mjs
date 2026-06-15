export function createInitialState() {
  return {
    screen: "library",
    activeDashboard: null,
    editing: false,
    draft: null,
    variableValues: {
      date: "2026-06-15",
      region: "us-central",
      severity: "high"
    },
    searchedValues: {},
    hasSearched: false,
    refreshing: false,
    selectedWidgetId: null,
    dialog: null,
    toast: null
  };
}

export function filterDashboards(dashboards, searchText) {
  const query = searchText.trim().toLowerCase();
  if (!query) return dashboards;

  return dashboards.filter((dashboard) =>
    `${dashboard.name} ${dashboard.description}`.toLowerCase().includes(query)
  );
}

export function commitVariableValues(values) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => String(value).trim() !== "")
  );
}

export function startDraft(state, dashboard) {
  return {
    ...state,
    screen: "dashboard",
    activeDashboard: structuredClone(dashboard),
    draft: structuredClone(dashboard),
    editing: true,
    selectedWidgetId: dashboard.widgets[0]?.id ?? null
  };
}

export function cancelDraft(state) {
  return {
    ...state,
    editing: false,
    draft: null,
    selectedWidgetId: null,
    activeDashboard: structuredClone(state.activeDashboard)
  };
}

