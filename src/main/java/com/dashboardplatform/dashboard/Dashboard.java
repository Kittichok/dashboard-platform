package com.dashboardplatform.dashboard;

import java.time.Instant;
import java.util.UUID;

public record Dashboard(
    UUID id,
    String name,
    String description,
    String widgetsJson,
    String variableStateJson,
    long version,
    Instant createdAt,
    Instant updatedAt
) {
}
