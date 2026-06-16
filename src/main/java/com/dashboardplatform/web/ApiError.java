package com.dashboardplatform.web;

import java.util.Map;

public record ApiError(
    String code,
    String message,
    Map<String, String> fieldErrors
) {
    public static ApiError of(String code, String message) {
        return new ApiError(code, message, Map.of());
    }

    public static ApiError validation(Map<String, String> fieldErrors) {
        return new ApiError("validation_error", "Validation failed.", fieldErrors);
    }
}
