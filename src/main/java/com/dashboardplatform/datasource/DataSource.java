package com.dashboardplatform.datasource;

import java.time.Instant;
import java.util.UUID;

public record DataSource(
    UUID id,
    String name,
    String type,
    String configJson,
    long version,
    Instant createdAt,
    Instant updatedAt
) {
}
