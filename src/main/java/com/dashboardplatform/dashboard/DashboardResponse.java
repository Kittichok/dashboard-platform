package com.dashboardplatform.dashboard;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record DashboardResponse(
    UUID id,
    String name,
    String description,
    List<Map<String, Object>> widgets,
    long version,
    String createdAt,
    String updatedAt
) {
    private static final TypeReference<List<Map<String, Object>>> WIDGET_LIST =
        new TypeReference<>() {
        };

    static DashboardResponse from(Dashboard dashboard, ObjectMapper objectMapper) {
        return new DashboardResponse(
            dashboard.id(),
            dashboard.name(),
            dashboard.description(),
            parseWidgets(dashboard.widgetsJson(), objectMapper),
            dashboard.version(),
            dashboard.createdAt().toString(),
            dashboard.updatedAt().toString());
    }

    private static List<Map<String, Object>> parseWidgets(
        String widgetsJson,
        ObjectMapper objectMapper
    ) {
        try {
            return objectMapper.readValue(widgetsJson, WIDGET_LIST);
        } catch (java.io.IOException exception) {
            throw new UncheckedIOException("Failed to parse stored dashboard widgets", exception);
        }
    }
}
