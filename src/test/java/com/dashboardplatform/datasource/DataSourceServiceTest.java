package com.dashboardplatform.datasource;

import static com.dashboardplatform.datasource.DataSourceExceptions.DataSourceInUseException;
import static com.dashboardplatform.datasource.DataSourceExceptions.DataSourceValidationException;
import static com.dashboardplatform.datasource.DataSourceExceptions.DataSourceVersionConflictException;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.dashboardplatform.dashboard.Dashboard;
import com.dashboardplatform.dashboard.DashboardRepository;
import com.dashboardplatform.widget.Widget;
import com.dashboardplatform.widget.WidgetRepository;
import com.dashboardplatform.widget.WidgetType;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;

class DataSourceServiceTest {
    private static final Instant NOW = Instant.parse("2026-06-20T12:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Test
    void create_data_source_trims_input_sets_version_and_serializes_config() {
        var repository = new InMemoryDataSourceRepository();
        var service = createService(repository, new InMemoryDashboardRepository(), new InMemoryWidgetRepository(), uuidSequence(
            UUID.fromString("11111111-1111-1111-1111-111111111111")));

        var created = service.createDataSource("  Orders API  ", "rest", Map.of(
            "baseUrl", "https://api.example.test",
            "authentication", Map.of("type", "none")));

        assertEquals("Orders API", created.name());
        assertEquals(1L, created.version());
        assertEquals(NOW, created.createdAt());
        assertTrue(created.configJson().contains("\"baseUrl\":\"https://api.example.test\""));
        assertEquals(created, repository.findById(created.id()).orElseThrow());
    }

    @Test
    void create_data_source_rejects_invalid_rest_config() {
        var service = createService(
            new InMemoryDataSourceRepository(),
            new InMemoryDashboardRepository(),
            new InMemoryWidgetRepository(),
            uuidSequence(UUID.fromString("11111111-1111-1111-1111-111111111111")));

        var exception = assertThrows(
            DataSourceValidationException.class,
            () -> service.createDataSource("Orders API", "rest", Map.of(
                "baseUrl", "ftp://invalid",
                "authentication", Map.of("type", "api_key_header"))));

        assertTrue(exception.fieldErrors().containsKey("config.baseUrl"));
        assertTrue(exception.fieldErrors().containsKey("config.authentication.headerName"));
        assertTrue(exception.fieldErrors().containsKey("config.authentication.value"));
    }

    @Test
    void import_and_export_round_trip_config() {
        var repository = new InMemoryDataSourceRepository();
        var service = createService(repository, new InMemoryDashboardRepository(), new InMemoryWidgetRepository(), uuidSequence(
            UUID.fromString("11111111-1111-1111-1111-111111111111")));

        var created = service.importDataSource("Orders API", "rest", Map.of(
            "baseUrl", "https://api.example.test",
            "authentication", Map.of("type", "bearer_token", "value", "secret")));
        var exported = service.exportDataSource(created.id());

        assertEquals("Orders API", exported.get("name"));
        assertEquals("rest", exported.get("type"));
        assertEquals(Map.of(
            "baseUrl", "https://api.example.test",
            "authentication", Map.of("type", "bearer_token", "value", "secret")), exported.get("config"));
    }

    @Test
    void delete_data_source_rejects_when_widgets_reference_it() {
        var sourceId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        var repository = new InMemoryDataSourceRepository();
        repository.insert(new DataSource(
            sourceId,
            "Orders API",
            "rest",
            "{\"baseUrl\":\"https://api.example.test\",\"authentication\":{\"type\":\"none\"}}",
            3L,
            NOW,
            NOW));
        var dashboards = new InMemoryDashboardRepository();
        dashboards.insert(new Dashboard(
            UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            "Service Operations",
            "",
            "[]",
            "{}",
            1L,
            NOW,
            NOW));
        var widgets = new InMemoryWidgetRepository();
        widgets.put(UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), List.of(new Widget(
            UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
            "Latency",
            WidgetType.metric,
            0,
            0,
            2,
            2,
            null,
            """
                {"kind":"rest","dataSourceId":"11111111-1111-1111-1111-111111111111","request":{"path":"/latency","method":"GET","headers":{},"body":null}}
                """)));

        var service = createService(repository, dashboards, widgets, uuidSequence(
            UUID.fromString("22222222-2222-2222-2222-222222222222")));

        var exception = assertThrows(DataSourceInUseException.class, () -> service.deleteDataSource(sourceId, 3L));

        assertEquals(List.of(new DataSourceReference(
            UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            "Service Operations",
            UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
            "Latency")), exception.references());
        assertTrue(repository.existsById(sourceId));
    }

    @Test
    void delete_data_source_rejects_stale_version() {
        var sourceId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        var repository = new InMemoryDataSourceRepository();
        repository.insert(new DataSource(
            sourceId,
            "Orders API",
            "rest",
            "{\"baseUrl\":\"https://api.example.test\",\"authentication\":{\"type\":\"none\"}}",
            2L,
            NOW,
            NOW));
        var service = createService(repository, new InMemoryDashboardRepository(), new InMemoryWidgetRepository(), uuidSequence(
            UUID.fromString("22222222-2222-2222-2222-222222222222")));

        assertThrows(DataSourceVersionConflictException.class, () -> service.deleteDataSource(sourceId, 1L));
        assertTrue(repository.existsById(sourceId));
    }

    @Test
    void list_references_ignores_table_widgets_and_legacy_inline_rest_widgets() {
        var sourceId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        var dashboards = new InMemoryDashboardRepository();
        var dashboardId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        dashboards.insert(new Dashboard(dashboardId, "Workspace", "", "[]", "{}", 1L, NOW, NOW));
        var widgets = new InMemoryWidgetRepository();
        widgets.put(dashboardId, List.of(
            new Widget(
                UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                "Database rows",
                WidgetType.table,
                0,
                0,
                2,
                2,
                null,
                """
                    {"type":"table","table":"orders","columns":["id"],"limit":10}
                    """),
            new Widget(
                UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc"),
                "Legacy REST",
                WidgetType.metric,
                0,
                0,
                2,
                2,
                null,
                """
                    {"type":"rest","url":"https://api.example.test/legacy","method":"GET","headers":{},"body":null}
                    """)));

        var service = createService(new InMemoryDataSourceRepository(), dashboards, widgets, uuidSequence(
            UUID.fromString("dddddddd-dddd-dddd-dddd-dddddddddddd")));

        assertFalse(service.listReferences(sourceId).iterator().hasNext());
    }

    private DataSourceService createService(
        InMemoryDataSourceRepository repository,
        InMemoryDashboardRepository dashboardRepository,
        InMemoryWidgetRepository widgetRepository,
        Supplier<UUID> uuidSupplier
    ) {
        return new DataSourceService(
            repository,
            dashboardRepository,
            widgetRepository,
            CLOCK,
            uuidSupplier,
            OBJECT_MAPPER);
    }

    private Supplier<UUID> uuidSequence(UUID... ids) {
        var remaining = new ArrayList<>(List.of(ids));
        return () -> {
            if (remaining.isEmpty()) {
                throw new IllegalStateException("No more UUIDs available for test");
            }
            return remaining.removeFirst();
        };
    }

    private static final class InMemoryDataSourceRepository implements DataSourceRepository {
        private final Map<UUID, DataSource> dataSources = new LinkedHashMap<>();

        @Override
        public List<DataSource> findAll() {
            return dataSources.values().stream()
                .sorted(Comparator.comparing(DataSource::updatedAt).reversed())
                .toList();
        }

        @Override
        public Optional<DataSource> findById(UUID id) {
            return Optional.ofNullable(dataSources.get(id));
        }

        @Override
        public void insert(DataSource dataSource) {
            dataSources.put(dataSource.id(), dataSource);
        }

        @Override
        public boolean update(DataSource dataSource, long expectedVersion) {
            var existing = dataSources.get(dataSource.id());
            if (existing == null || existing.version() != expectedVersion) {
                return false;
            }
            dataSources.put(dataSource.id(), dataSource);
            return true;
        }

        @Override
        public boolean delete(UUID id, long expectedVersion) {
            var existing = dataSources.get(id);
            if (existing == null || existing.version() != expectedVersion) {
                return false;
            }
            dataSources.remove(id);
            return true;
        }

        @Override
        public boolean existsById(UUID id) {
            return dataSources.containsKey(id);
        }
    }

    private static final class InMemoryDashboardRepository implements DashboardRepository {
        private final Map<UUID, Dashboard> dashboards = new LinkedHashMap<>();

        @Override
        public List<Dashboard> findAll() {
            return dashboards.values().stream()
                .sorted(Comparator.comparing(Dashboard::updatedAt).reversed())
                .toList();
        }

        @Override
        public Optional<Dashboard> findById(UUID id) {
            return Optional.ofNullable(dashboards.get(id));
        }

        @Override
        public boolean existsById(UUID id) {
            return dashboards.containsKey(id);
        }

        @Override
        public void insert(Dashboard dashboard) {
            dashboards.put(dashboard.id(), dashboard);
        }

        @Override
        public boolean update(Dashboard dashboard, long expectedVersion) {
            var existing = dashboards.get(dashboard.id());
            if (existing == null || existing.version() != expectedVersion) {
                return false;
            }
            dashboards.put(dashboard.id(), dashboard);
            return true;
        }

        @Override
        public boolean delete(UUID id, long expectedVersion) {
            var existing = dashboards.get(id);
            if (existing == null || existing.version() != expectedVersion) {
                return false;
            }
            dashboards.remove(id);
            return true;
        }
    }

    private static final class InMemoryWidgetRepository implements WidgetRepository {
        private final Map<UUID, List<Widget>> widgetsByDashboardId = new LinkedHashMap<>();

        @Override
        public List<Widget> findAll(UUID dashboardId) {
            return widgetsByDashboardId.getOrDefault(dashboardId, List.of());
        }

        @Override
        public void save(UUID dashboardId, long expectedDashboardVersion, List<Widget> widgets) {
            widgetsByDashboardId.put(dashboardId, List.copyOf(widgets));
        }

        @Override
        public boolean dashboardExists(UUID dashboardId) {
            return widgetsByDashboardId.containsKey(dashboardId);
        }

        void put(UUID dashboardId, List<Widget> widgets) {
            widgetsByDashboardId.put(dashboardId, List.copyOf(widgets));
        }
    }
}
