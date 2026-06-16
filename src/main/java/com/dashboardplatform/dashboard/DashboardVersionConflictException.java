package com.dashboardplatform.dashboard;

import java.util.UUID;

public class DashboardVersionConflictException extends RuntimeException {
    public DashboardVersionConflictException(UUID id) {
        super("Dashboard version conflict: " + id);
    }
}
