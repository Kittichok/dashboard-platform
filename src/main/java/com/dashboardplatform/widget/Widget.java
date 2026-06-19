package com.dashboardplatform.widget;

import java.util.UUID;

public record Widget(
    UUID id,
    String title,
    WidgetType type,
    int x,
    int y,
    int w,
    int h,
    String displayConfigJson,
    String dataSourceJson
) {
}
