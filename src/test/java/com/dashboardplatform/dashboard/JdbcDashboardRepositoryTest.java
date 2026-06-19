package com.dashboardplatform.dashboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertIterableEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.time.Instant;
import java.util.UUID;
import com.dashboardplatform.DatabaseMigrationRunner;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class JdbcDashboardRepositoryTest {

    @TempDir
    Path tempDir;

    @Test
    void insertAndFindByIdPreservesWidgetsJson() {
        var repository = createRepository(tempDir.resolve("insert-read.db"));
        var dashboard = dashboard(
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Service Operations",
            "Incidents and platform health",
            "[{\"id\":\"widget-1\",\"type\":\"text\"}]",
            1L,
            Instant.parse("2026-06-15T09:00:00Z"),
            Instant.parse("2026-06-15T09:00:00Z"));

        repository.insert(dashboard);

        var stored = repository.findById(dashboard.id());
        assertTrue(stored.isPresent());
        assertEquals(dashboard, stored.orElseThrow());
    }

    @Test
    void findAllReturnsDashboardsOrderedByMostRecentlyUpdated() {
        var repository = createRepository(tempDir.resolve("ordering.db"));
        var older = dashboard(
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Service Operations",
            "Incidents and platform health",
            "[]",
            1L,
            Instant.parse("2026-06-15T09:00:00Z"),
            Instant.parse("2026-06-15T09:00:00Z"));
        var newest = dashboard(
            UUID.fromString("22222222-2222-2222-2222-222222222222"),
            "Revenue Pulse",
            "Commercial performance",
            "[]",
            1L,
            Instant.parse("2026-06-15T09:30:00Z"),
            Instant.parse("2026-06-15T10:30:00Z"));
        var middle = dashboard(
            UUID.fromString("33333333-3333-3333-3333-333333333333"),
            "Quality Signals",
            "Defect and release trends",
            "[]",
            1L,
            Instant.parse("2026-06-15T09:15:00Z"),
            Instant.parse("2026-06-15T09:45:00Z"));

        repository.insert(older);
        repository.insert(newest);
        repository.insert(middle);

        assertIterableEquals(
            java.util.List.of(newest, middle, older),
            repository.findAll());
    }

    @Test
    void dashboardsPersistAcrossRepositoryInstancesPointingAtSameSQLiteFile() {
        var databasePath = tempDir.resolve("shared.db");
        var firstRepository = createRepository(databasePath);
        var dashboard = dashboard(
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Service Operations",
            "Incidents and platform health",
            "[{\"id\":\"widget-1\"}]",
            1L,
            Instant.parse("2026-06-15T09:00:00Z"),
            Instant.parse("2026-06-15T09:00:00Z"));

        firstRepository.insert(dashboard);

        var secondRepository = createRepository(databasePath);
        var stored = secondRepository.findById(dashboard.id());
        assertTrue(stored.isPresent());
        assertEquals(dashboard, stored.orElseThrow());
    }

    @Test
    void updateSucceedsOnlyWhenDashboardIdAndVersionMatch() {
        var repository = createRepository(tempDir.resolve("update.db"));
        var original = dashboard(
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Service Operations",
            "Incidents and platform health",
            "[{\"id\":\"widget-1\"}]",
            1L,
            Instant.parse("2026-06-15T09:00:00Z"),
            Instant.parse("2026-06-15T09:00:00Z"));
        repository.insert(original);

        var updated = dashboard(
            original.id(),
            "Service Operations Copy",
            "Renamed dashboard",
            original.widgetsJson(),
            2L,
            original.createdAt(),
            Instant.parse("2026-06-15T10:00:00Z"));

        assertTrue(repository.update(updated, original.version()));
        assertEquals(updated, repository.findById(original.id()).orElseThrow());

        var staleAttempt = dashboard(
            original.id(),
            "Stale overwrite",
            "Should not persist",
            original.widgetsJson(),
            3L,
            original.createdAt(),
            Instant.parse("2026-06-15T11:00:00Z"));

        assertFalse(repository.update(staleAttempt, original.version()));
        assertEquals(updated, repository.findById(original.id()).orElseThrow());
        assertTrue(repository.existsById(original.id()));

        var missingId = UUID.fromString("99999999-9999-9999-9999-999999999999");
        var missingAttempt = dashboard(
            missingId,
            "Missing dashboard",
            "",
            "[]",
            1L,
            Instant.parse("2026-06-15T12:00:00Z"),
            Instant.parse("2026-06-15T12:00:00Z"));

        assertFalse(repository.update(missingAttempt, 1L));
        assertFalse(repository.existsById(missingId));
    }

    @Test
    void deleteSucceedsOnlyWhenDashboardIdAndVersionMatch() {
        var repository = createRepository(tempDir.resolve("delete.db"));
        var original = dashboard(
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Service Operations",
            "Incidents and platform health",
            "[{\"id\":\"widget-1\"}]",
            2L,
            Instant.parse("2026-06-15T09:00:00Z"),
            Instant.parse("2026-06-15T10:00:00Z"));
        repository.insert(original);

        assertFalse(repository.delete(original.id(), 1L));
        assertTrue(repository.existsById(original.id()));

        var missingId = UUID.fromString("99999999-9999-9999-9999-999999999999");
        assertFalse(repository.delete(missingId, 1L));
        assertFalse(repository.existsById(missingId));

        assertTrue(repository.delete(original.id(), original.version()));
        assertFalse(repository.existsById(original.id()));
        assertTrue(repository.findById(original.id()).isEmpty());
    }

    private JdbcDashboardRepository createRepository(Path databasePath) {
        var dataSource = sqliteDataSource(databasePath);
        new DatabaseMigrationRunner(dataSource).run();
        return new JdbcDashboardRepository(new JdbcTemplate(dataSource));
    }

    private DriverManagerDataSource sqliteDataSource(Path databasePath) {
        var dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.sqlite.JDBC");
        dataSource.setUrl("jdbc:sqlite:" + databasePath.toAbsolutePath());
        return dataSource;
    }

    private Dashboard dashboard(
        UUID id,
        String name,
        String description,
        String widgetsJson,
        long version,
        Instant createdAt,
        Instant updatedAt
    ) {
        return new Dashboard(id, name, description, widgetsJson, "{}", version, createdAt, updatedAt);
    }
}
