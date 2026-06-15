import test from "node:test";
import assert from "node:assert/strict";

import {
  cancelDraft,
  commitVariableValues,
  createInitialState,
  filterDashboards,
  startDraft
} from "../src/model.mjs";

test("initial state opens on the dashboard library", () => {
  const state = createInitialState();
  assert.equal(state.screen, "library");
  assert.equal(state.editing, false);
  assert.deepEqual(state.searchedValues, {});
});

test("dashboard filtering matches name and description", () => {
  const dashboards = [
    { name: "Service Operations", description: "Incidents and platform health" },
    { name: "Revenue Pulse", description: "Commercial performance" }
  ];

  assert.deepEqual(filterDashboards(dashboards, "health"), [dashboards[0]]);
  assert.deepEqual(filterDashboards(dashboards, "REVENUE"), [dashboards[1]]);
});

test("committing variable values omits empty optional values", () => {
  const values = { date: "2026-06-15", region: "", severity: "high" };
  assert.deepEqual(commitVariableValues(values), {
    date: "2026-06-15",
    severity: "high"
  });
});

test("cancelling edit mode restores the saved dashboard", () => {
  const saved = { id: "ops", name: "Service Operations", widgets: [{ id: "a" }] };
  const state = startDraft(createInitialState(), saved);
  state.draft.name = "Changed name";
  const cancelled = cancelDraft(state);

  assert.equal(cancelled.editing, false);
  assert.equal(cancelled.draft, null);
  assert.equal(cancelled.activeDashboard.name, "Service Operations");
});

