package com.dashboardplatform.datasource;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record DataSourceResponse(
    UUID id,
    String name,
    String type,
    Map<String, Object> config,
    long version,
    Instant createdAt,
    Instant updatedAt
) {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> OBJECT_MAP = new TypeReference<>() {
    };

    public static DataSourceResponse from(DataSource dataSource) {
        return new DataSourceResponse(
            dataSource.id(),
            dataSource.name(),
            dataSource.type(),
            parseConfig(dataSource.configJson()),
            dataSource.version(),
            dataSource.createdAt(),
            dataSource.updatedAt());
    }

    private static Map<String, Object> parseConfig(String json) {
        try {
            return OBJECT_MAPPER.readValue(json, OBJECT_MAP);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored data source config_json is invalid JSON.", exception);
        }
    }
}
