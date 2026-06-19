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
    Map<String, String> variableState,
    long version,
    String createdAt,
    String updatedAt
) {
    private static final TypeReference<List<Map<String, Object>>> WIDGET_LIST =
        new TypeReference<>() {
        };
    private static final TypeReference<Map<String, String>> VARIABLE_STATE_MAP =
        new TypeReference<>() {
        };

    static DashboardResponse from(Dashboard dashboard, ObjectMapper objectMapper) {
        return new DashboardResponse(
            dashboard.id(),
            dashboard.name(),
            dashboard.description(),
            parseWidgets(dashboard.widgetsJson(), objectMapper),
                parseVariableState(dashboard.variableStateJson(), objectMapper),
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

    private static Map<String, String> parseVariableState(
        String variableStateJson,
        ObjectMapper objectMapper
    ) {
        try {
            if (variableStateJson == null || variableStateJson.isBlank()) {
                return Map.of();
            }
            return objectMapper.readValue(variableStateJson, VARIABLE_STATE_MAP);
        } catch (java.io.IOException exception) {
            throw new UncheckedIOException("Failed to parse stored dashboard variable state", exception);
        }
    }
}
