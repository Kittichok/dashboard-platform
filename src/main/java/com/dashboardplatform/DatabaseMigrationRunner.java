package com.dashboardplatform;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.Objects;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class DatabaseMigrationRunner {
    private static final List<String> MIGRATIONS = List.of(
        "db/migration/V1__create_dashboards.sql",
        "db/migration/V2__add_dashboard_variable_state_json.sql"
    );

    private final DataSource dataSource;

    @Autowired
    public DatabaseMigrationRunner(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @PostConstruct
    public void run() {
        try (var connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                createHistoryTable(connection);
                for (int index = 0; index < MIGRATIONS.size(); index++) {
                    var version = index + 1;
                    var migrationPath = MIGRATIONS.get(index);
                    if (!hasVersion(connection, version)) {
                        executeMigration(connection, readMigration(migrationPath));
                        recordVersion(connection, version, migrationPath);
                    }
                }
                connection.commit();
            } catch (RuntimeException | SQLException exception) {
                connection.rollback();
                throw exception;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to migrate dashboard database", exception);
        }
    }

    private void createHistoryTable(Connection connection) throws SQLException {
        try (var statement = connection.createStatement()) {
            statement.execute("""
                CREATE TABLE IF NOT EXISTS schema_history (
                    version INTEGER PRIMARY KEY,
                    description TEXT NOT NULL,
                    installed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """);
        }
    }

    private boolean hasVersion(Connection connection, int version) throws SQLException {
        try (var statement = connection.prepareStatement(
            "SELECT COUNT(*) FROM schema_history WHERE version = ?")) {
            statement.setInt(1, version);
            try (var resultSet = statement.executeQuery()) {
                return resultSet.next() && resultSet.getInt(1) == 1;
            }
        }
    }

    private void executeMigration(Connection connection, String migration) throws SQLException {
        for (var statementSql : migration.split(";")) {
            var sql = statementSql.trim();
            if (!sql.isEmpty()) {
                try (var statement = connection.createStatement()) {
                    statement.execute(sql);
                }
            }
        }
    }

    private void recordVersion(Connection connection, int version, String description)
        throws SQLException {
        try (var statement = connection.prepareStatement(
            "INSERT INTO schema_history (version, description) VALUES (?, ?)")) {
            statement.setInt(1, version);
            statement.setString(2, description);
            statement.executeUpdate();
        }
    }

    private String readMigration(String path) {
        try (var stream = new ClassPathResource(path).getInputStream()) {
            return new String(
                Objects.requireNonNull(stream).readAllBytes(),
                StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to read database migration " + path, exception);
        }
    }
}
