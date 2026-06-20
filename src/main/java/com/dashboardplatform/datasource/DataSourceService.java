package com.dashboardplatform.datasource;

import static com.dashboardplatform.datasource.DataSourceExceptions.DataSourceInUseException;
import static com.dashboardplatform.datasource.DataSourceExceptions.DataSourceNotFoundException;
import static com.dashboardplatform.datasource.DataSourceExceptions.DataSourceValidationException;
import static com.dashboardplatform.datasource.DataSourceExceptions.DataSourceVersionConflictException;

import com.dashboardplatform.dashboard.DashboardRepository;
import com.dashboardplatform.widget.WidgetRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class DataSourceService {
    private static final int MAX_NAME_LENGTH = 120;
    private static final String REST_TYPE = "rest";

    private final DataSourceRepository dataSourceRepository;
    private final DashboardRepository dashboardRepository;
    private final WidgetRepository widgetRepository;
    private final Clock clock;
    private final Supplier<UUID> uuidSupplier;
    private final ObjectMapper objectMapper;

    @Autowired
    public DataSourceService(
        DataSourceRepository dataSourceRepository,
        DashboardRepository dashboardRepository,
        WidgetRepository widgetRepository,
        ObjectMapper objectMapper
    ) {
        this(dataSourceRepository, dashboardRepository, widgetRepository, Clock.systemUTC(), UUID::randomUUID, objectMapper);
    }

    DataSourceService(
        DataSourceRepository dataSourceRepository,
        DashboardRepository dashboardRepository,
        WidgetRepository widgetRepository,
        Clock clock,
        Supplier<UUID> uuidSupplier,
        ObjectMapper objectMapper
    ) {
        this.dataSourceRepository = dataSourceRepository;
        this.dashboardRepository = dashboardRepository;
        this.widgetRepository = widgetRepository;
        this.clock = clock;
        this.uuidSupplier = uuidSupplier;
        this.objectMapper = objectMapper;
    }

    public List<DataSource> listDataSources() {
        return dataSourceRepository.findAll();
    }

    public DataSource createDataSource(String name, String type, Map<String, Object> config) {
        var errors = validate(name, type, config);
        if (!errors.isEmpty()) {
            throw new DataSourceValidationException(errors);
        }
        var now = Instant.now(clock);
        var dataSource = new DataSource(
            uuidSupplier.get(),
            name.trim(),
            type.trim(),
            writeConfig(config),
            1L,
            now,
            now);
        dataSourceRepository.insert(dataSource);
        return dataSource;
    }

    public DataSource updateDataSource(UUID id, long version, String name, String type, Map<String, Object> config) {
        var errors = validate(name, type, config);
        if (!errors.isEmpty()) {
            throw new DataSourceValidationException(errors);
        }
        var existing = dataSourceRepository.findById(id)
            .orElseThrow(() -> new DataSourceNotFoundException(id));
        var updated = new DataSource(
            existing.id(),
            name.trim(),
            type.trim(),
            writeConfig(config),
            existing.version() + 1,
            existing.createdAt(),
            Instant.now(clock));
        if (!dataSourceRepository.update(updated, version)) {
            throw new DataSourceVersionConflictException(id);
        }
        return updated;
    }

    public DataSource importDataSource(String name, String type, Map<String, Object> config) {
        return createDataSource(name, type, config);
    }

    public Map<String, Object> exportDataSource(UUID id) {
        var dataSource = dataSourceRepository.findById(id)
            .orElseThrow(() -> new DataSourceNotFoundException(id));
        return Map.of(
            "name", dataSource.name(),
            "type", dataSource.type(),
            "config", readConfig(dataSource.configJson()));
    }

    public void deleteDataSource(UUID id, long version) {
        var references = listReferences(id);
        if (!references.isEmpty()) {
            throw new DataSourceInUseException(id, references);
        }
        if (!dataSourceRepository.existsById(id)) {
            throw new DataSourceNotFoundException(id);
        }
        if (!dataSourceRepository.delete(id, version)) {
            throw new DataSourceVersionConflictException(id);
        }
    }

    public List<DataSourceReference> listReferences(UUID dataSourceId) {
        var references = new ArrayList<DataSourceReference>();
        for (var dashboard : dashboardRepository.findAll()) {
            for (var widget : widgetRepository.findAll(dashboard.id())) {
                var referencedId = extractReferencedDataSourceId(widget.dataSourceJson());
                if (dataSourceId.equals(referencedId)) {
                    references.add(new DataSourceReference(
                        dashboard.id(),
                        dashboard.name(),
                        widget.id(),
                        widget.title()));
                }
            }
        }
        return references;
    }

    private Map<String, String> validate(String name, String type, Map<String, Object> config) {
        var errors = new LinkedHashMap<String, String>();
        if (name == null || name.trim().isEmpty()) {
            errors.put("name", "Name is required.");
        } else if (name.trim().length() > MAX_NAME_LENGTH) {
            errors.put("name", "Name must be at most " + MAX_NAME_LENGTH + " characters.");
        }
        if (type == null || type.trim().isEmpty()) {
            errors.put("type", "Type is required.");
        } else if (!REST_TYPE.equals(type.trim())) {
            errors.put("type", "Only REST API Sources are supported.");
        }
        if (config == null || config.isEmpty()) {
            errors.put("config", "Config is required.");
        } else {
            validateRestConfig(config, errors);
        }
        return errors;
    }

    private void validateRestConfig(Map<String, Object> config, Map<String, String> errors) {
        var baseUrl = stringValue(config.get("baseUrl"));
        if (baseUrl == null || baseUrl.isBlank()) {
            errors.put("config.baseUrl", "Base URL is required.");
        } else if (!isValidHttpUrl(baseUrl)) {
            errors.put("config.baseUrl", "Base URL must be a valid HTTP or HTTPS URL.");
        }

        var authenticationNode = config.get("authentication");
        if (!(authenticationNode instanceof Map<?, ?> authentication)) {
            errors.put("config.authentication", "Authentication is required.");
            return;
        }

        var authType = stringValue(authentication.get("type"));
        if (authType == null || authType.isBlank()) {
            errors.put("config.authentication.type", "Authentication type is required.");
            return;
        }
        switch (authType) {
            case "none" -> {
            }
            case "bearer_token" -> {
                if (isBlank(stringValue(authentication.get("value")))) {
                    errors.put("config.authentication.value", "Bearer token is required.");
                }
            }
            case "api_key_header" -> {
                if (isBlank(stringValue(authentication.get("headerName")))) {
                    errors.put("config.authentication.headerName", "Header name is required.");
                }
                if (isBlank(stringValue(authentication.get("value")))) {
                    errors.put("config.authentication.value", "API key value is required.");
                }
            }
            default -> errors.put("config.authentication.type", "Authentication type is invalid.");
        }
    }

    private UUID extractReferencedDataSourceId(String dataSourceJson) {
        if (dataSourceJson == null || dataSourceJson.isBlank()) {
            return null;
        }
        try {
            JsonNode node = objectMapper.readTree(dataSourceJson);
            if (!"rest".equals(node.path("kind").asText(null))) {
                return null;
            }
            var id = node.path("dataSourceId").asText(null);
            if (id == null || id.isBlank()) {
                return null;
            }
            return UUID.fromString(id);
        } catch (Exception exception) {
            return null;
        }
    }

    private String writeConfig(Map<String, Object> config) {
        try {
            return objectMapper.writeValueAsString(config);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize data source config.", exception);
        }
    }

    private Map<String, Object> readConfig(String configJson) {
        try {
            return objectMapper.readValue(configJson, new TypeReference<>() {
            });
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored data source config_json is invalid JSON.", exception);
        }
    }

    private boolean isValidHttpUrl(String baseUrl) {
        try {
            var uri = new URI(baseUrl);
            return uri.getScheme() != null
                && ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                && uri.getHost() != null;
        } catch (URISyntaxException exception) {
            return false;
        }
    }

    private String stringValue(Object value) {
        return value instanceof String string ? string : null;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
