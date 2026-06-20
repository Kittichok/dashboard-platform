package com.dashboardplatform.widget;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.dashboardplatform.datasource.DataSource;
import com.dashboardplatform.datasource.DataSourceRepository;
import com.dashboardplatform.widget.WidgetExceptions.WidgetFetchException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.web.client.RestClient;

class WidgetServiceTest {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final Instant NOW = Instant.parse("2026-06-20T12:00:00Z");

    @TempDir
    java.nio.file.Path tempDir;

    @Test
    void fetch_widget_merges_default_headers_before_widget_headers() throws Exception {
        var capturedHeaders = new AtomicReference<Map<String, List<String>>>();
        var server = startServer(exchange -> {
            capturedHeaders.set(copyHeaders(exchange));
            writeResponse(exchange, "{\"ok\":true}");
        });
        try {
            var dashboardId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
            var widgetId = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
            var dataSourceId = UUID.fromString("11111111-1111-1111-1111-111111111111");
            var service = createService(
                List.of(new DataSource(
                    dataSourceId,
                    "Orders API",
                    "rest",
                    OBJECT_MAPPER.writeValueAsString(Map.of(
                        "baseUrl", serverBaseUrl(server),
                        "authentication", Map.of("type", "none"),
                        "headers", Map.of(
                            "Content-Type", "application/json",
                            "Accept", "application/json"))),
                    1L,
                    NOW,
                    NOW)),
                dashboardId,
                List.of(new Widget(
                    widgetId,
                    "Orders",
                    WidgetType.metric,
                    0,
                    0,
                    2,
                    2,
                    null,
                    """
                        {"kind":"rest","dataSourceId":"11111111-1111-1111-1111-111111111111","request":{"path":"/orders","method":"GET","headers":{"Accept":"text/csv"},"body":null}}
                        """)));

            assertEquals("{\"ok\":true}", service.fetchWidgetData(dashboardId, widgetId, null));
            assertEquals(List.of("text/csv"), capturedHeaders.get().get("Accept"));
            assertEquals(List.of("application/json"), capturedHeaders.get().get("Content-type"));
        } finally {
            server.stop(0);
        }
    }

    @Test
    void fetch_widget_rejects_request_headers_that_override_authentication_header() throws Exception {
        var dashboardId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        var widgetId = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
        var dataSourceId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        var service = createService(
            List.of(new DataSource(
                dataSourceId,
                "Orders API",
                "rest",
                OBJECT_MAPPER.writeValueAsString(Map.of(
                    "baseUrl", "https://api.example.test",
                    "authentication", Map.of("type", "api_key_header", "headerName", "X-API-Key", "value", "secret"),
                    "headers", Map.of("Content-Type", "application/json"))),
                1L,
                NOW,
                NOW)),
            dashboardId,
            List.of(new Widget(
                widgetId,
                "Orders",
                WidgetType.metric,
                0,
                0,
                2,
                2,
                null,
                """
                    {"kind":"rest","dataSourceId":"11111111-1111-1111-1111-111111111111","request":{"path":"/orders","method":"GET","headers":{"x-api-key":"override"},"body":null}}
                    """)));

        var exception = assertThrows(WidgetFetchException.class, () -> service.fetchWidgetData(dashboardId, widgetId, null));

        assertEquals(400, exception.httpStatus());
        assertEquals("Widget request header conflicts with data source authentication header.", exception.body());
    }

    private WidgetService createService(List<DataSource> dataSources, UUID dashboardId, List<Widget> widgets) {
        var widgetRepository = new InMemoryWidgetRepository(dashboardId, widgets);
        var dataSourceRepository = new InMemoryDataSourceRepository(dataSources);
        var dataSource = new DriverManagerDataSource("jdbc:sqlite:" + tempDir.resolve("widget-service.db"));
        var jdbcTemplate = new JdbcTemplate(dataSource);
        return new WidgetService(
            widgetRepository,
            dataSourceRepository,
            RestClient.builder().build(),
            () -> UUID.fromString("99999999-9999-9999-9999-999999999999"),
            jdbcTemplate,
            OBJECT_MAPPER);
    }

    private HttpServer startServer(ExchangeHandler handler) throws IOException {
        var server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/", exchange -> handler.handle(exchange));
        server.start();
        return server;
    }

    private String serverBaseUrl(HttpServer server) {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    private Map<String, List<String>> copyHeaders(HttpExchange exchange) {
        var headers = new LinkedHashMap<String, List<String>>();
        exchange.getRequestHeaders().forEach((name, values) -> headers.put(name, List.copyOf(values)));
        return headers;
    }

    private void writeResponse(HttpExchange exchange, String body) throws IOException {
        var bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream outputStream = exchange.getResponseBody()) {
            outputStream.write(bytes);
        }
    }

    @FunctionalInterface
    private interface ExchangeHandler {
        void handle(HttpExchange exchange) throws IOException;
    }

    private static final class InMemoryDataSourceRepository implements DataSourceRepository {
        private final Map<UUID, DataSource> dataSources;

        private InMemoryDataSourceRepository(List<DataSource> dataSources) {
            this.dataSources = new LinkedHashMap<>();
            for (var dataSource : dataSources) {
                this.dataSources.put(dataSource.id(), dataSource);
            }
        }

        @Override
        public List<DataSource> findAll() {
            return dataSources.values().stream().toList();
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
            dataSources.put(dataSource.id(), dataSource);
            return true;
        }

        @Override
        public boolean delete(UUID id, long expectedVersion) {
            return dataSources.remove(id) != null;
        }

        @Override
        public boolean existsById(UUID id) {
            return dataSources.containsKey(id);
        }
    }

    private static final class InMemoryWidgetRepository implements WidgetRepository {
        private final UUID dashboardId;
        private final List<Widget> widgets;

        private InMemoryWidgetRepository(UUID dashboardId, List<Widget> widgets) {
            this.dashboardId = dashboardId;
            this.widgets = List.copyOf(widgets);
        }

        @Override
        public List<Widget> findAll(UUID dashboardId) {
            if (this.dashboardId.equals(dashboardId)) {
                return widgets;
            }
            return List.of();
        }

        @Override
        public void save(UUID dashboardId, long expectedDashboardVersion, List<Widget> widgets) {
            throw new UnsupportedOperationException("save not needed for this test");
        }

        @Override
        public boolean dashboardExists(UUID dashboardId) {
            return this.dashboardId.equals(dashboardId);
        }
    }
}
