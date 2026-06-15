# Dashboard Platform Visual Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a visual-only Dashboard Platform prototype with three navigable screens and realistic mock data.

**Architecture:** A dependency-free single-page application renders from a small in-memory state model. View rendering, mock data, and styling are separated so the screen structure remains easy to change.

**Tech Stack:** HTML, CSS, browser JavaScript modules, Node.js HTTP server, Node.js test runner.

---

### Task 1: Project foundation

**Files:**
- Create: `dashboard-platform/package.json`
- Create: `dashboard-platform/server.mjs`
- Create: `dashboard-platform/index.html`
- Create: `dashboard-platform/src/model.mjs`
- Test: `dashboard-platform/tests/model.test.mjs`

- [ ] Write tests for initial state, dashboard filtering, variable commits, and edit-mode draft cancellation.
- [ ] Run `npm test` and confirm the tests fail before implementation.
- [ ] Implement the state helpers and static server.
- [ ] Run `npm test` and confirm all model tests pass.

### Task 2: Three-screen application

**Files:**
- Create: `dashboard-platform/src/data.mjs`
- Create: `dashboard-platform/src/app.mjs`

- [ ] Add Service Operations dashboard and widget mock data.
- [ ] Render Dashboard Library, dashboard view, and Edit Mode from application state.
- [ ] Wire navigation, Search, Refresh, Edit Mode, Save, Cancel, widget selection, and modal interactions.
- [ ] Verify each control updates only local prototype state.

### Task 3: Operational visual system

**Files:**
- Create: `dashboard-platform/src/styles.css`

- [ ] Implement the approved navy, off-white, white, and cobalt color system.
- [ ] Style the sidebar, toolbar, dashboard cards, variables, widgets, dialogs, and editor inspector.
- [ ] Add desktop, tablet, and mobile layouts.
- [ ] Add focus-visible and reduced-motion rules.

### Task 4: Documentation and verification

**Files:**
- Create: `dashboard-platform/README.md`
- Modify: `AGENTS.md`

- [ ] Document exact start and test commands.
- [ ] Run `npm test`.
- [ ] Start the server and verify the HTML, CSS, and JavaScript assets return HTTP 200.
- [ ] Check the working tree and record the completed file set.

