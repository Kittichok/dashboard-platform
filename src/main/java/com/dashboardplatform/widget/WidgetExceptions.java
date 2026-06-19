package com.dashboardplatform.widget;

import java.util.Map;
import java.util.UUID;

public class WidgetExceptions {

    private WidgetExceptions() {
    }

    public static class WidgetNotFoundException extends RuntimeException {
        public WidgetNotFoundException(UUID dashboardId, UUID widgetId) {
            super("Widget not found: " + widgetId + " in dashboard " + dashboardId);
        }
    }

    public static class WidgetValidationException extends RuntimeException {
        private final Map<String, String> fieldErrors;

        public WidgetValidationException(Map<String, String> fieldErrors) {
            super("Widget validation failed");
            this.fieldErrors = Map.copyOf(fieldErrors);
        }

        public Map<String, String> fieldErrors() {
            return fieldErrors;
        }
    }

    public static class WidgetFetchException extends RuntimeException {
        private final int httpStatus;
        private final String body;

        public WidgetFetchException(int httpStatus, String body) {
            super("Widget fetch failed with status " + httpStatus);
            this.httpStatus = httpStatus;
            this.body = body;
        }

        public int httpStatus() {
            return httpStatus;
        }

        public String body() {
            return body;
        }
    }
}
