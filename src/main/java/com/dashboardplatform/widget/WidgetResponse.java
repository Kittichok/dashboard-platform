package com.dashboardplatform.widget;

import java.util.UUID;

public record WidgetResponse(
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
    static WidgetResponse from(Widget widget) {
        return new WidgetResponse(
            widget.id(),
            widget.title(),
            widget.type(),
            widget.x(),
            widget.y(),
            widget.w(),
            widget.h(),
            widget.displayConfigJson(),
            widget.dataSourceJson());
    }
}
