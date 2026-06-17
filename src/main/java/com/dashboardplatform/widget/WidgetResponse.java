package com.dashboardplatform.widget;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;

public record WidgetResponse(
    UUID id,
    String title,
    WidgetType type,
    int x,
    int y,
    int w,
    int h,
    Map<String, Object> displayConfig,
    Map<String, Object> dataSource
) {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> OBJECT_MAP = new TypeReference<>() {
    };

    static WidgetResponse from(Widget widget) {
        return new WidgetResponse(
            widget.id(),
            widget.title(),
            widget.type(),
            widget.x(),
            widget.y(),
            widget.w(),
            widget.h(),
            parseObject(widget.displayConfigJson(), "displayConfigJson"),
            parseObject(widget.dataSourceJson(), "dataSourceJson"));
    }

    private static Map<String, Object> parseObject(String json, String fieldName) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return OBJECT_MAPPER.readValue(json, OBJECT_MAP);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored widget " + fieldName + " is invalid JSON.", exception);
        }
    }
}
