package com.dashboardplatform.dashboard;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

record CreateDashboardRequest(
    @NotBlank(message = "Dashboard name is required.")
    @Size(max = 120, message = "Dashboard name must be at most 120 characters.")
    String name,
    @Size(max = 500, message = "Description must be at most 500 characters.")
    String description
) {
}

record RenameDashboardRequest(
    @NotBlank(message = "Dashboard name is required.")
    @Size(max = 120, message = "Dashboard name must be at most 120 characters.")
    String name,
    @Size(max = 500, message = "Description must be at most 500 characters.")
    String description,
    @Positive long version
) {
}
