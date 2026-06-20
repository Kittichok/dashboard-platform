package com.dashboardplatform.datasource;

import java.util.UUID;

public record DataSourceReference(
    UUID dashboardId,
    String dashboardName,
    UUID widgetId,
    String widgetTitle
) {
}
