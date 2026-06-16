# Run as a Windows Service with WinSW

The bundled Spring Boot JAR will run on Windows Server as an automatically started WinSW service that restarts after failure and writes rotating logs. SQLite will live in a separate persistent data directory, while the HTTP port and database path are supplied through service environment or configuration values.
