# Dashboard Platform

A product that lets people assemble data-driven dashboards from configurable parts.

## Quick Start

### Prerequisites

- Java 21 (JDK)
- Node.js (build-time only, managed automatically by Maven)

### Run the full application

```powershell
.\mvnw.cmd spring-boot:run
```

Open http://localhost:8080.

### Run frontend in dev mode (hot reload)

```powershell
Set-Location src/main/frontend
npm.cmd run dev
```

Open http://localhost:5173 (proxies API to http://localhost:8080).

### Run tests

Backend:
```powershell
.\mvnw.cmd test
```

Frontend:
```powershell
Set-Location src/main/frontend
npm.cmd run test:run
```

### Build executable JAR

```powershell
.\mvnw.cmd package
java -jar target/dashboard-platform-*.jar
```

### Configuration

Set `DASHBOARD_DB_PATH` to control where the SQLite database is stored (defaults to `./data/dashboard-platform.db`):

```powershell
$env:DASHBOARD_DB_PATH='C:\data\my-dashboards.db'
.\mvnw.cmd spring-boot:run
```

## Architecture

- **Backend:** Java 21 + Spring Boot 3.5, Spring MVC, Spring JDBC, SQLite
- **Frontend:** React + TypeScript + Vite (built into the JAR via `frontend-maven-plugin`)
- **Database:** Embedded SQLite, versioned via a custom migration runner

Node.js is required at build time only. Production deployments run the JAR with no Node dependency.

