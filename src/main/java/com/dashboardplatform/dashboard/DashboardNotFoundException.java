package com.dashboardplatform.dashboard;

import java.util.UUID;

public class DashboardNotFoundException extends RuntimeException {
    public DashboardNotFoundException(UUID id) {
        super("Dashboard not found: " + id);
    }
}
