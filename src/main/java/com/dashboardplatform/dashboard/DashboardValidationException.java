package com.dashboardplatform.dashboard;

import java.util.Map;

public class DashboardValidationException extends RuntimeException {
    private final Map<String, String> fieldErrors;

    public DashboardValidationException(Map<String, String> fieldErrors) {
        super("Dashboard validation failed");
        this.fieldErrors = Map.copyOf(fieldErrors);
    }

    public Map<String, String> fieldErrors() {
        return fieldErrors;
    }
}
