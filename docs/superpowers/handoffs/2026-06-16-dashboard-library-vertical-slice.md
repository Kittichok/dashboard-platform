# Dashboard Library Vertical Slice Handoff

Continue implementation in `D:\AI\dashboard-platform`.

## Read First

- `docs/superpowers/specs/2026-06-15-dashboard-library-vertical-slice-design.md`
- `docs/superpowers/plans/2026-06-15-dashboard-library-vertical-slice.md`

## User Requirements

- Single Maven project.
- React/TypeScript/Vite lives in `src/main/frontend`.
- Java 21 + Spring Boot + SQLite.
- Automated tests must be authored/maintained by GPT-5.4 subagents, not by the coordinating agent.
- Do not modify/remove untracked `CONTEXT.md` or `docs/adr/` unless explicitly requested.

## Commits

- `c26685a` docs: define dashboard library vertical slice
- `d303fce` docs: plan dashboard library vertical slice
- `221f358` feat: add spring dashboard library backend

## Completed Work

- Maven Wrapper, Spring Boot, SQLite migration runner, repository/service/controller/API error handling, SPA fallback.
- Frontend foundation under `src/main/frontend`.
- Vite upgraded to `8.0.16` to clear npm audit advisories.
- `.gitignore` added for `target/`, frontend `dist/`, `node_modules/`, `tsbuildinfo`, local db/logs.
- Old root prototype runtime deleted after React replacement tests passed.
- React Dashboard Library implemented with API client, cards, create/rename/delete dialogs, duplicate/delete flows, local search, notices, and migrated visual styling.

## Verification Already Run

- Java backend/API suite with frontend skipped:
  `.\mvnw.cmd '-DskipFrontend=true' test`
  Result: 35 tests passed, 0 failures.
- Frontend tests:
  `npm.cmd run test:run`
  Result: 14 tests passed, 0 failures.
- Frontend build:
  `npm.cmd run build`
  Result: success with Vite 8.0.16.
- npm audit after Vite upgrade, run with network approval:
  Result: 0 vulnerabilities.

## Environment Notes

- Set `JAVA_HOME=C:\Program Files\Java\jdk-21` before Maven commands.
- Maven/network commands may require escalation.
- A prior full Maven run hit Windows `EPERM` when `npm ci` tried to rewrite frontend `node_modules`. Backend-only verification uses `-DskipFrontend=true`; full packaging still needs to be tested carefully.
- Current worktree has intentional untracked `CONTEXT.md` and `docs/adr/`.

## Likely Dirty Files

- Deleted old prototype files:
  `index.html`, `package.json`, `server.mjs`, `src/app.mjs`, `src/data.mjs`, `src/model.mjs`, `src/styles.css`, `tests/model.test.mjs`
- Modified:
  `src/main/frontend/src/App.tsx`
- Added:
  `src/main/frontend/src/dashboard/**`
  `src/main/frontend/src/styles.css`
  `src/main/frontend/src/test/setup.ts`
  `src/main/frontend/src/dashboard/__tests__/**`
- Untracked user docs:
  `CONTEXT.md`, `docs/adr/`

## Exact Next Steps

1. Update `README.md` for Maven/Spring/Vite workflow, `DASHBOARD_DB_PATH`, and production JAR.
2. Run full frontend tests/build again if needed.
3. Run full Maven test/package. If `npm ci` hits Windows `EPERM`, investigate cleanly; do not commit `node_modules` or `dist`.
4. Run packaged JAR HTTP smoke test:
   `GET /`, `GET /api/dashboards`, `POST` create, `PATCH` rename, restart with same DB, confirm persistence, `DELETE`.
5. Use Browser/in-app browser for local visual QA after starting the app.
6. Commit frontend/docs slice, excluding `CONTEXT.md` and `docs/adr/`.
