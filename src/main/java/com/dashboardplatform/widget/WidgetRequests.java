package com.dashboardplatform.widget;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class WidgetRequests {

    private WidgetRequests() {
    }

    record AddWidgetRequest(
        @NotBlank @Size(max = 120) String title,
        @NotNull WidgetType type,
        @Min(0) int x,
        @Min(0) int y,
        @Min(1) int w,
        @Min(1) int h,
        String displayConfigJson,
        String dataSourceJson
    ) {
    }

    record UpdateWidgetRequest(
        @NotBlank @Size(max = 120) String title,
        @NotNull WidgetType type,
        @Min(0) int x,
        @Min(0) int y,
        @Min(1) int w,
        @Min(1) int h,
        String displayConfigJson,
        String dataSourceJson
    ) {
    }

    record ReorderWidgetsRequest(List<@NotNull UUID> orderedIds) {
    }

    record ImportWidgetRequest(
        @NotBlank @Size(max = 120) String title,
        @NotNull WidgetType type,
        @Min(0) int x,
        @Min(0) int y,
        @Min(1) int w,
        @Min(1) int h,
        Map<String, Object> displayConfig,
        Map<String, Object> dataSource
    ) {
    }
}
