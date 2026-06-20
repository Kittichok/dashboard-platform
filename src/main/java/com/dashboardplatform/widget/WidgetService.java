package com.dashboardplatform.widget;

import com.dashboardplatform.datasource.DataSourceRepository;
import com.dashboardplatform.dashboard.DashboardNotFoundException;
import com.dashboardplatform.widget.WidgetExceptions.WidgetFetchException;
import com.dashboardplatform.widget.WidgetExceptions.WidgetNotFoundException;
import com.dashboardplatform.widget.WidgetExceptions.WidgetValidationException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class WidgetService {

    private static final int MAX_TITLE_LENGTH = 120;

    private final WidgetRepository widgetRepository;
    private final DataSourceRepository dataSourceRepository;
    private final RestClient restClient;
    private final Supplier<UUID> uuidSupplier;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    @Autowired
    public WidgetService(
        WidgetRepository widgetRepository,
        DataSourceRepository dataSourceRepository,
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper
    ) {
        this(widgetRepository, dataSourceRepository, RestClient.builder().build(), UUID::randomUUID, jdbcTemplate, objectMapper);
    }

    WidgetService(
        WidgetRepository widgetRepository,
        DataSourceRepository dataSourceRepository,
        RestClient restClient,
        Supplier<UUID> uuidSupplier,
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper
    ) {
        this.widgetRepository = widgetRepository;
        this.dataSourceRepository = dataSourceRepository;
        this.restClient = restClient;
        this.uuidSupplier = uuidSupplier;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public List<Widget> listWidgets(UUID dashboardId) {
        return widgetRepository.findAll(dashboardId);
    }

    public Widget addWidget(UUID dashboardId, long dashboardVersion, String title, WidgetType type,
                            int x, int y, int w, int h, String displayConfigJson, String dataSourceJson) {
        var errors = validate(title, type, w, h);
        validateDataSourceSelection(dataSourceJson, errors);
        if (!errors.isEmpty()) {
            throw new WidgetValidationException(errors);
        }
        ensureDashboardExists(dashboardId);
        var widgets = new ArrayList<>(widgetRepository.findAll(dashboardId));
        var widget = new Widget(
            uuidSupplier.get(), title, type, x, y, w, h, displayConfigJson, dataSourceJson);
        widgets.add(widget);
        widgetRepository.save(dashboardId, dashboardVersion, widgets);
        return widget;
    }

    public Widget updateWidget(UUID dashboardId, UUID widgetId, long dashboardVersion,
                               String title, WidgetType type, int x, int y, int w, int h,
                               String displayConfigJson, String dataSourceJson) {
        var errors = validate(title, type, w, h);
        validateDataSourceSelection(dataSourceJson, errors);
        if (!errors.isEmpty()) {
            throw new WidgetValidationException(errors);
        }
        ensureDashboardExists(dashboardId);
        var widgets = new ArrayList<>(widgetRepository.findAll(dashboardId));
        var index = -1;
        for (int i = 0; i < widgets.size(); i++) {
            if (widgets.get(i).id().equals(widgetId)) {
                index = i;
                break;
            }
        }
        if (index == -1) {
            throw new WidgetNotFoundException(dashboardId, widgetId);
        }
        var updated = new Widget(
            widgetId, title, type, x, y, w, h, displayConfigJson, dataSourceJson);
        widgets.set(index, updated);
        widgetRepository.save(dashboardId, dashboardVersion, widgets);
        return updated;
    }

    public List<Widget> reorderWidgets(UUID dashboardId, long dashboardVersion, List<UUID> orderedIds) {
        ensureDashboardExists(dashboardId);
        var currentWidgets = new ArrayList<>(widgetRepository.findAll(dashboardId));
        var widgetMap = new LinkedHashMap<UUID, Widget>();
        for (var w : currentWidgets) {
            widgetMap.put(w.id(), w);
        }
        for (var id : orderedIds) {
            if (!widgetMap.containsKey(id)) {
                var errors = new LinkedHashMap<String, String>();
                errors.put("orderedIds", "Widget not found: " + id);
                throw new WidgetValidationException(errors);
            }
        }
        var reordered = new ArrayList<Widget>();
        for (var id : orderedIds) {
            reordered.add(widgetMap.get(id));
        }
        widgetRepository.save(dashboardId, dashboardVersion, reordered);
        return reordered;
    }

    public void removeWidget(UUID dashboardId, UUID widgetId, long dashboardVersion) {
        ensureDashboardExists(dashboardId);
        var widgets = new ArrayList<>(widgetRepository.findAll(dashboardId));
        var removed = widgets.removeIf(w -> w.id().equals(widgetId));
        if (!removed) {
            throw new WidgetNotFoundException(dashboardId, widgetId);
        }
        widgetRepository.save(dashboardId, dashboardVersion, widgets);
    }

    public List<String> listTables() {
        return jdbcTemplate.query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'schema_history' ORDER BY name",
            (rs, rowNum) -> rs.getString("name")
        );
    }

    public List<String> listColumns(String table) {
        var validTables = listTables();
        if (!validTables.contains(table)) {
            throw new WidgetFetchException(400, "Unknown table: " + table);
        }
        return jdbcTemplate.query(
            "PRAGMA table_info(\"" + table.replace("\"", "\"\"") + "\")",
            (rs, rowNum) -> rs.getString("name")
        );
    }

    public String fetchWidgetData(UUID dashboardId, UUID widgetId, String dataSourceJsonOverride) {
        ensureDashboardExists(dashboardId);
        if (dataSourceJsonOverride != null && !dataSourceJsonOverride.isBlank()) {
            return executeFetch(dataSourceJsonOverride);
        }
        var widgets = widgetRepository.findAll(dashboardId);
        var widget = widgets.stream()
            .filter(w -> w.id().equals(widgetId))
            .findFirst()
            .orElseThrow(() -> new WidgetNotFoundException(dashboardId, widgetId));
        if (widget.dataSourceJson() == null || widget.dataSourceJson().isBlank()) {
            var errors = new LinkedHashMap<String, String>();
            errors.put("dataSource", "Widget has no data source configured.");
            throw new WidgetValidationException(errors);
        }
        return executeFetch(widget.dataSourceJson());
    }

    private String executeFetch(String dataSourceJson) {
        try {
            JsonNode dataSourceNode = objectMapper.readTree(dataSourceJson);
            if (isTableDataSource(dataSourceNode)) {
                return executeTableFetch(objectMapper.treeToValue(dataSourceNode, LegacyDataSource.class));
            }
            if (isLegacyInlineRestDataSource(dataSourceNode)) {
                return executeLegacyRestFetch(objectMapper.treeToValue(dataSourceNode, LegacyDataSource.class));
            }
            if (isSelectedRestDataSource(dataSourceNode)) {
                return executeSelectedRestFetch(objectMapper.treeToValue(dataSourceNode, SelectedRestDataSource.class));
            }
            throw new WidgetFetchException(400, "Invalid data source configuration");
        } catch (WidgetFetchException e) {
            throw e;
        } catch (Exception e) {
            throw new WidgetFetchException(500, e.getMessage());
        }
    }

    private String executeLegacyRestFetch(LegacyDataSource dataSource) {
        var method = "POST".equalsIgnoreCase(dataSource.method()) ? HttpMethod.POST : HttpMethod.GET;
        var request = restClient.method(method)
            .uri(dataSource.url())
            .headers(headers -> dataSource.headers().forEach(headers::set));
        if (method == HttpMethod.POST && dataSource.body() != null && !dataSource.body().isBlank()) {
            request = request.body(dataSource.body());
        }
        var response = request.retrieve().toEntity(String.class);
        return response.getBody();
    }

    private String executeSelectedRestFetch(SelectedRestDataSource selection) throws JsonProcessingException {
        if (selection.dataSourceId() == null) {
            throw new WidgetFetchException(400, "Selected data source does not exist.");
        }
        var source = dataSourceRepository.findById(selection.dataSourceId())
            .orElseThrow(() -> new WidgetFetchException(400, "Selected data source does not exist."));
        var config = objectMapper.readValue(source.configJson(), RestSourceConfig.class);
        var requestConfig = selection.request() == null ? new RestRequest("", "GET", Map.of(), null) : selection.request();
        var mergedHeaders = new LinkedHashMap<String, String>();
        applyAuthenticationHeader(config.authentication(), mergedHeaders);
        mergeDefaultHeaders(config.headers(), mergedHeaders, config.authentication());
        mergeWidgetHeaders(requestConfig.headers(), mergedHeaders, config.authentication());
        var method = "POST".equalsIgnoreCase(requestConfig.method()) ? HttpMethod.POST : HttpMethod.GET;
        var request = restClient.method(method)
            .uri(resolveRequestUrl(config.baseUrl(), requestConfig.path()))
            .headers(headers -> mergedHeaders.forEach(headers::set));
        if (method == HttpMethod.POST && requestConfig.body() != null && !requestConfig.body().isBlank()) {
            request = request.body(requestConfig.body());
        }
        var response = request.retrieve().toEntity(String.class);
        return response.getBody();
    }

    private String executeTableFetch(LegacyDataSource ds) throws Exception {
        if (ds.table() == null || ds.table().isBlank()) {
            throw new WidgetFetchException(400, "Table name is required.");
        }
        if (ds.columns() == null || ds.columns().isEmpty()) {
            throw new WidgetFetchException(400, "At least one column must be selected.");
        }
        var validTables = listTables();
        if (!validTables.contains(ds.table())) {
            throw new WidgetFetchException(400, "Invalid table: " + ds.table());
        }
        var validColumnNames = listColumns(ds.table());
        var validSet = java.util.Set.copyOf(validColumnNames);
        for (var col : ds.columns()) {
            if (!validSet.contains(col)) {
                throw new WidgetFetchException(400, "Invalid column: " + col);
            }
        }
        var quotedCols = ds.columns().stream().map(c -> "\"" + c.replace("\"", "\"\"") + "\"").toList();
        var sql = "SELECT " + String.join(", ", quotedCols) + " FROM \"" + ds.table().replace("\"", "\"\"") + "\" ORDER BY rowid";
        if (ds.limit() != null && ds.limit() > 0) {
            sql += " LIMIT " + ds.limit();
        }
        var rows = jdbcTemplate.query(sql, (rs, rowNum) -> {
            var row = new LinkedHashMap<String, Object>();
            for (var col : ds.columns()) {
                row.put(col, rs.getObject(col));
            }
            return row;
        });
        return objectMapper.writeValueAsString(rows);
    }

    private void ensureDashboardExists(UUID dashboardId) {
        if (!widgetRepository.dashboardExists(dashboardId)) {
            throw new DashboardNotFoundException(dashboardId);
        }
    }

    private Map<String, String> validate(String title, WidgetType type, int w, int h) {
        var errors = new LinkedHashMap<String, String>();
        if (title == null || title.trim().isEmpty()) {
            errors.put("title", "Title is required.");
        } else if (title.trim().length() > MAX_TITLE_LENGTH) {
            errors.put("title", "Title must be at most " + MAX_TITLE_LENGTH + " characters.");
        }
        if (type == null) {
            errors.put("type", "Type is required.");
        }
        if (w < 1) {
            errors.put("w", "Width must be at least 1.");
        }
        if (h < 1) {
            errors.put("h", "Height must be at least 1.");
        }
        return errors;
    }

    private void validateDataSourceSelection(String dataSourceJson, Map<String, String> errors) {
        if (dataSourceJson == null || dataSourceJson.isBlank()) {
            return;
        }
        try {
            JsonNode dataSourceNode = objectMapper.readTree(dataSourceJson);
            if (isLegacyInlineRestDataSource(dataSourceNode) || isTableDataSource(dataSourceNode)) {
                return;
            }
            if (!isSelectedRestDataSource(dataSourceNode)) {
                errors.put("dataSource", "Data source configuration is invalid.");
                return;
            }
            var selection = objectMapper.treeToValue(dataSourceNode, SelectedRestDataSource.class);
            if (selection.dataSourceId() == null || !dataSourceRepository.existsById(selection.dataSourceId())) {
                errors.put("dataSource", "Select a data source.");
            }
            if (selection.request() == null) {
                errors.put("dataSource", "Widget request is required.");
                return;
            }
            if (selection.request().path() == null || selection.request().path().isBlank()) {
                errors.put("dataSource", "Request path is required.");
            }
            if (selection.request().method() == null
                || (!"GET".equalsIgnoreCase(selection.request().method()) && !"POST".equalsIgnoreCase(selection.request().method()))) {
                errors.put("dataSource", "Request method must be GET or POST.");
            }
            validateAuthenticationHeaderCollision(selection.dataSourceId(), selection.request().headers(), errors);
        } catch (Exception exception) {
            errors.put("dataSource", "Data source configuration is invalid.");
        }
    }

    private void validateAuthenticationHeaderCollision(
        UUID dataSourceId,
        Map<String, String> requestHeaders,
        Map<String, String> errors
    ) throws JsonProcessingException {
        if (dataSourceId == null) {
            return;
        }
        var source = dataSourceRepository.findById(dataSourceId).orElse(null);
        if (source == null) {
            return;
        }
        var config = objectMapper.readValue(source.configJson(), RestSourceConfig.class);
        var authHeader = config.authentication() == null ? null : config.authentication().headerName();
        if (authHeader == null || authHeader.isBlank() || requestHeaders == null) {
            return;
        }
        for (var header : requestHeaders.keySet()) {
            if (header != null && header.equalsIgnoreCase(authHeader)) {
                errors.put("dataSource", "Request headers must not override the data source authentication header.");
                return;
            }
        }
    }

    private void applyAuthenticationHeader(Authentication authentication, Map<String, String> requestHeaders) {
        if (authentication == null || authentication.type() == null) {
            return;
        }
        var existingHeaders = new HashSet<String>();
        for (var header : requestHeaders.keySet()) {
            if (header != null) {
                existingHeaders.add(header.toLowerCase(java.util.Locale.ROOT));
            }
        }
        switch (authentication.type()) {
            case "none" -> {
            }
            case "bearer_token" -> {
                if (authentication.value() != null && !authentication.value().isBlank()) {
                    if (existingHeaders.contains("authorization")) {
                        throw new WidgetFetchException(400, "Widget request header conflicts with data source authentication header.");
                    }
                    requestHeaders.put("Authorization", "Bearer " + authentication.value());
                }
            }
            case "api_key_header" -> {
                if (authentication.headerName() != null && !authentication.headerName().isBlank()) {
                    if (existingHeaders.contains(authentication.headerName().toLowerCase(java.util.Locale.ROOT))) {
                        throw new WidgetFetchException(400, "Widget request header conflicts with data source authentication header.");
                    }
                    requestHeaders.put(authentication.headerName(), authentication.value());
                }
            }
            default -> throw new WidgetFetchException(400, "Invalid data source authentication configuration");
        }
    }

    private void mergeDefaultHeaders(
        Map<String, String> defaultHeaders,
        Map<String, String> mergedHeaders,
        Authentication authentication
    ) {
        if (defaultHeaders == null || defaultHeaders.isEmpty()) {
            return;
        }
        var authHeaderName = authentication == null ? null : authentication.headerName();
        for (var entry : defaultHeaders.entrySet()) {
            if (authHeaderName != null && entry.getKey() != null && entry.getKey().equalsIgnoreCase(authHeaderName)) {
                throw new WidgetFetchException(400, "Default headers cannot override the data source authentication header.");
            }
            mergedHeaders.put(entry.getKey(), entry.getValue());
        }
    }

    private void mergeWidgetHeaders(
        Map<String, String> requestHeaders,
        Map<String, String> mergedHeaders,
        Authentication authentication
    ) {
        if (requestHeaders == null || requestHeaders.isEmpty()) {
            return;
        }
        var authHeaderName = authentication == null ? null : authentication.headerName();
        for (var entry : requestHeaders.entrySet()) {
            if (authHeaderName != null && entry.getKey() != null && entry.getKey().equalsIgnoreCase(authHeaderName)) {
                throw new WidgetFetchException(400, "Widget request header conflicts with data source authentication header.");
            }
            mergedHeaders.put(entry.getKey(), entry.getValue());
        }
    }

    private String resolveRequestUrl(String baseUrl, String path) {
        if (baseUrl == null || baseUrl.isBlank()) {
            throw new WidgetFetchException(400, "Selected data source is invalid.");
        }
        if (path == null || path.isBlank()) {
            return baseUrl;
        }
        if (path.startsWith("http://") || path.startsWith("https://")) {
            throw new WidgetFetchException(400, "Widget request path must be relative to the selected data source.");
        }
        try {
            return new URI(baseUrl).resolve(path.startsWith("/") ? "." + path : path).toString();
        } catch (URISyntaxException exception) {
            throw new WidgetFetchException(400, "Selected data source is invalid.");
        }
    }

    private boolean isLegacyInlineRestDataSource(JsonNode dataSourceNode) {
        return "rest".equals(dataSourceNode.path("type").asText(null))
            && dataSourceNode.has("url");
    }

    private boolean isTableDataSource(JsonNode dataSourceNode) {
        return "table".equals(dataSourceNode.path("type").asText(null));
    }

    private boolean isSelectedRestDataSource(JsonNode dataSourceNode) {
        return "rest".equals(dataSourceNode.path("kind").asText(null))
            && dataSourceNode.has("request");
    }

    private record LegacyDataSource(
        String type,
        String url,
        String method,
        Map<String, String> headers,
        String body,
        String table,
        List<String> columns,
        Integer limit
    ) {
        private LegacyDataSource {
            headers = headers == null ? Collections.emptyMap() : headers;
            columns = columns == null ? Collections.emptyList() : columns;
        }
    }

    private record SelectedRestDataSource(String kind, UUID dataSourceId, RestRequest request) {
    }

    private record RestRequest(String path, String method, Map<String, String> headers, String body) {
        private RestRequest {
            headers = headers == null ? Collections.emptyMap() : headers;
        }
    }

    private record RestSourceConfig(String baseUrl, Authentication authentication, Map<String, String> headers) {
        private RestSourceConfig {
            headers = headers == null ? Collections.emptyMap() : headers;
        }
    }

    private record Authentication(String type, String headerName, String value) {
    }
}
