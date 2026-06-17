# Dashboard Platform — agent guide

## Build & run

| Command | Description |
|---|---|
| `.\mvnw.cmd spring-boot:run` | Full app at localhost:8080 |
| `.\mvnw.cmd test` | Backend tests only |
| `.\mvnw.cmd package -DskipFrontend` | Build JAR, skip frontend |
| `npm.cmd run dev` (in `src/main/frontend`) | Frontend dev server at localhost:5173 |
| `npm.cmd run test:run` (in `src/main/frontend`) | Frontend tests (Vitest) |
| `npm.cmd run build` (in `src/main/frontend`) | `tsc -b && vite build` |
| `npm.cmd run test` (in `src/main/frontend`) | Vitest watch mode |

`.\mvnw.cmd package` builds everything (Node install → npm install → test → build → copy to `target/classes/static/` → JAR). Set `$env:DASHBOARD_DB_PATH` for custom SQLite path (default: `./data/dashboard-platform.db`).

## Architecture

**Backend** (`src/main/java/com/dashboardplatform/`):
- Spring Boot 3.5.7, Java 21, no Lombok, no `@Autowired` (constructor injection only)
- `DashboardController` (`/api/dashboards`) — REST CRUD with optimistic version locking (version bump in service, checked in repo via `WHERE version = ?`)
- `SpaForwardController` — catch-all forwarding non-API, non-asset paths to `/index.html`
- `DatabaseMigrationRunner` — hand-rolled migration runner (classpath SQL files, `schema_history` table), not Flyway/Liquibase
- SQLite via `sqlite-jdbc`, IDs/Timestamps stored as text

**Frontend** (`src/main/frontend/`):
- React 19, TypeScript 5, Vite 8, Vitest 4
- `/api` proxied to localhost:8080 in dev
- React Testing Library + jsdom, no MSW

## Testing quirks

- **No `@SpringBootTest`** — back-end tests use `MockMvcBuilders.standaloneSetup`, `@TempDir` for real SQLite files, or hand-rolled in-memory stubs
- Backend test classes are **package-private**, method names are `snake_case`
- Frontend test setup (`src/test/setup.ts`): auto-cleanup + `vi.restoreAllMocks` per test
- Frontend tests: `vitest run --passWithNoTests` (already the `test:run` script)

## Repo conventions

- Domain model is `record Dashboard` — immutable, mutations create new instances
- SQL as text blocks, JSON test payloads as text blocks
- No `@JsonProperty` / Jackson annotations (default naming)
- No `@Transactional` — manual transaction handling in `DatabaseMigrationRunner`
- `ApiFailure | NetworkFailure` discriminated union on frontend for error handling
- `CONTEXT.md` defines domain language; refer to it for naming (`Workspace`, not Org; `Widget`, not Component; etc.)

## Files that exist but shouldn't be edited by agents

- `CONTEXT.md` — product domain language, reference only
- `src/main/resources/db/migration/` — schema migrations (append-only, new files)
- `src/main/frontend/package-lock.json`, `tsconfig.tsbuildinfo` — generated
