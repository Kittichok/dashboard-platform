package com.dashboardplatform;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertIterableEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.dashboardplatform.dashboard.Dashboard;
import com.dashboardplatform.dashboard.JdbcDashboardRepository;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class DatabaseMigrationRunnerTest {

    @TempDir
    Path tempDir;

    @Test
    void runCreatesSchemaHistoryAndDashboardsTables() {
        var dataSource = sqliteDataSource(tempDir.resolve("tables.db"));

        new DatabaseMigrationRunner(dataSource).run();

        var jdbcTemplate = new JdbcTemplate(dataSource);
        assertTrue(tableExists(jdbcTemplate, "schema_history"));
        assertTrue(tableExists(jdbcTemplate, "dashboards"));
    }

    @Test
    void runAppliesVersionOneExactlyOnceAcrossRepeatedInvocations() {
        var dataSource = sqliteDataSource(tempDir.resolve("repeatable.db"));
        var migrationRunner = new DatabaseMigrationRunner(dataSource);

        migrationRunner.run();
        migrationRunner.run();

        var jdbcTemplate = new JdbcTemplate(dataSource);
        assertIterableEquals(
            List.of(1L, 2L),
            jdbcTemplate.query(
                "select version from schema_history order by version",
                (resultSet, rowNum) -> resultSet.getLong("version")));
        assertEquals(2, jdbcTemplate.queryForObject("select count(*) from schema_history", Integer.class));
    }

    @Test
    void runProducesDatabaseThatFreshJdbcDashboardRepositoryCanUse() {
        var databasePath = tempDir.resolve("repository.db");
        var migrationDataSource = sqliteDataSource(databasePath);

        new DatabaseMigrationRunner(migrationDataSource).run();

        var repository = new JdbcDashboardRepository(new JdbcTemplate(sqliteDataSource(databasePath)));
        var dashboard = new Dashboard(
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Service Operations",
            "Incidents and platform health",
            "[{\"id\":\"widget-1\"}]",
            "{}",
            1L,
            Instant.parse("2026-06-15T09:00:00Z"),
            Instant.parse("2026-06-15T09:00:00Z"));

        repository.insert(dashboard);

        assertTrue(repository.findById(dashboard.id()).isPresent());
        assertEquals(dashboard, repository.findById(dashboard.id()).orElseThrow());
        assertFalse(repository.findAll().isEmpty());
    }

    private DriverManagerDataSource sqliteDataSource(Path databasePath) {
        var dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.sqlite.JDBC");
        dataSource.setUrl("jdbc:sqlite:" + databasePath.toAbsolutePath());
        return dataSource;
    }

    private boolean tableExists(JdbcTemplate jdbcTemplate, String tableName) {
        return Boolean.TRUE.equals(jdbcTemplate.query(
            "select exists(select 1 from sqlite_master where type = 'table' and name = ?)",
            preparedStatement -> preparedStatement.setString(1, tableName),
            resultSet -> resultSet.next() && resultSet.getInt(1) == 1));
    }
}
