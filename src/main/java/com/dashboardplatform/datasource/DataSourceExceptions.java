package com.dashboardplatform.datasource;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class DataSourceExceptions {

    private DataSourceExceptions() {
    }

    public static class DataSourceNotFoundException extends RuntimeException {
        public DataSourceNotFoundException(UUID id) {
            super("Data source not found: " + id);
        }
    }

    public static class DataSourceValidationException extends RuntimeException {
        private final Map<String, String> fieldErrors;

        public DataSourceValidationException(Map<String, String> fieldErrors) {
            super("Data source validation failed");
            this.fieldErrors = Map.copyOf(fieldErrors);
        }

        public Map<String, String> fieldErrors() {
            return fieldErrors;
        }
    }

    public static class DataSourceVersionConflictException extends RuntimeException {
        public DataSourceVersionConflictException(UUID id) {
            super("Data source version conflict: " + id);
        }
    }

    public static class DataSourceInUseException extends RuntimeException {
        private final List<DataSourceReference> references;

        public DataSourceInUseException(UUID id, List<DataSourceReference> references) {
            super("Data source is still referenced: " + id);
            this.references = List.copyOf(references);
        }

        public List<DataSourceReference> references() {
            return references;
        }
    }
}
