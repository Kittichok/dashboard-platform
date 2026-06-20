package com.dashboardplatform.datasource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertIterableEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.dashboardplatform.DatabaseMigrationRunner;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class JdbcDataSourceRepositoryTest {

    @TempDir
    Path tempDir;

    @Test
    void insert_and_find_all_preserve_rest_source_config_json() {
        var repository = createRepository(tempDir.resolve("data-sources.db"));
        var source = dataSource(
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Orders API",
            """
                {"baseUrl":"https://api.example.test","authentication":{"type":"none"}}
                """,
            1L,
            Instant.parse("2026-06-20T09:00:00Z"),
            Instant.parse("2026-06-20T09:00:00Z"));

        repository.insert(source);

        assertEquals(List.of(source), repository.findAll());
    }

    @Test
    void find_all_returns_data_sources_ordered_by_most_recently_updated() {
        var repository = createRepository(tempDir.resolve("ordering.db"));
        var older = dataSource(
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Orders API",
            "{\"baseUrl\":\"https://api.example.test/orders\",\"authentication\":{\"type\":\"none\"}}",
            1L,
            Instant.parse("2026-06-20T09:00:00Z"),
            Instant.parse("2026-06-20T09:00:00Z"));
        var newest = dataSource(
            UUID.fromString("22222222-2222-2222-2222-222222222222"),
            "Billing API",
            "{\"baseUrl\":\"https://api.example.test/billing\",\"authentication\":{\"type\":\"none\"}}",
            1L,
            Instant.parse("2026-06-20T09:10:00Z"),
            Instant.parse("2026-06-20T10:10:00Z"));
        var middle = dataSource(
            UUID.fromString("33333333-3333-3333-3333-333333333333"),
            "Catalog API",
            "{\"baseUrl\":\"https://api.example.test/catalog\",\"authentication\":{\"type\":\"none\"}}",
            1L,
            Instant.parse("2026-06-20T09:05:00Z"),
            Instant.parse("2026-06-20T09:30:00Z"));

        repository.insert(older);
        repository.insert(newest);
        repository.insert(middle);

        assertIterableEquals(List.of(newest, middle, older), repository.findAll());
    }

    @Test
    void update_and_delete_honor_expected_version() {
        var repository = createRepository(tempDir.resolve("update-delete.db"));
        var original = dataSource(
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Orders API",
            "{\"baseUrl\":\"https://api.example.test/orders\",\"authentication\":{\"type\":\"none\"}}",
            1L,
            Instant.parse("2026-06-20T09:00:00Z"),
            Instant.parse("2026-06-20T09:00:00Z"));
        repository.insert(original);

        var updated = dataSource(
            original.id(),
            "Orders API V2",
            "{\"baseUrl\":\"https://api.example.test/orders/v2\",\"authentication\":{\"type\":\"none\"}}",
            2L,
            original.createdAt(),
            Instant.parse("2026-06-20T10:00:00Z"));

        assertTrue(repository.update(updated, 1L));
        assertEquals(updated, repository.findById(original.id()).orElseThrow());
        assertFalse(repository.update(updated, 1L));
        assertFalse(repository.delete(original.id(), 1L));
        assertTrue(repository.delete(original.id(), 2L));
        assertFalse(repository.existsById(original.id()));
    }

    private JdbcDataSourceRepository createRepository(Path databasePath) {
        var dataSource = sqliteDataSource(databasePath);
        new DatabaseMigrationRunner(dataSource).run();
        return new JdbcDataSourceRepository(new JdbcTemplate(dataSource));
    }

    private DriverManagerDataSource sqliteDataSource(Path databasePath) {
        var dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.sqlite.JDBC");
        dataSource.setUrl("jdbc:sqlite:" + databasePath.toAbsolutePath());
        return dataSource;
    }

    private DataSource dataSource(
        UUID id,
        String name,
        String configJson,
        long version,
        Instant createdAt,
        Instant updatedAt
    ) {
        return new DataSource(id, name, "rest", configJson, version, createdAt, updatedAt);
    }
}
