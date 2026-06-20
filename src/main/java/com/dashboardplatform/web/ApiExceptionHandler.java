package com.dashboardplatform.web;

import com.dashboardplatform.dashboard.DashboardNotFoundException;
import com.dashboardplatform.dashboard.DashboardValidationException;
import com.dashboardplatform.dashboard.DashboardVersionConflictException;
import com.dashboardplatform.datasource.DataSourceExceptions.DataSourceInUseException;
import com.dashboardplatform.datasource.DataSourceExceptions.DataSourceNotFoundException;
import com.dashboardplatform.datasource.DataSourceExceptions.DataSourceValidationException;
import com.dashboardplatform.datasource.DataSourceExceptions.DataSourceVersionConflictException;
import com.dashboardplatform.widget.WidgetExceptions.WidgetFetchException;
import com.dashboardplatform.widget.WidgetExceptions.WidgetNotFoundException;
import com.dashboardplatform.widget.WidgetExceptions.WidgetValidationException;
import java.util.stream.Collectors;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger LOGGER = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(DashboardValidationException.class)
    public ResponseEntity<ApiError> handleDashboardValidation(
        DashboardValidationException exception
    ) {
        return ResponseEntity.badRequest().body(ApiError.validation(exception.fieldErrors()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleRequestValidation(
        MethodArgumentNotValidException exception
    ) {
        var fieldErrors = new LinkedHashMap<String, String>();
        for (FieldError fieldError : exception.getBindingResult().getFieldErrors()) {
            fieldErrors.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage());
        }
        return ResponseEntity.badRequest().body(ApiError.validation(fieldErrors));
    }

    @ExceptionHandler(DashboardNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiError.of(
                "dashboard_not_found",
                "The requested dashboard does not exist."));
    }

    @ExceptionHandler(DashboardVersionConflictException.class)
    public ResponseEntity<ApiError> handleConflict() {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiError.of(
                "dashboard_version_conflict",
                "The dashboard changed after it was loaded."));
    }

    @ExceptionHandler(WidgetValidationException.class)
    public ResponseEntity<ApiError> handleWidgetValidation(
        WidgetValidationException exception
    ) {
        return ResponseEntity.badRequest().body(ApiError.validation(exception.fieldErrors()));
    }

    @ExceptionHandler(DataSourceValidationException.class)
    public ResponseEntity<ApiError> handleDataSourceValidation(
        DataSourceValidationException exception
    ) {
        return ResponseEntity.badRequest().body(ApiError.validation(exception.fieldErrors()));
    }

    @ExceptionHandler(WidgetNotFoundException.class)
    public ResponseEntity<ApiError> handleWidgetNotFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiError.of("widget_not_found", "The requested widget does not exist."));
    }

    @ExceptionHandler(DataSourceNotFoundException.class)
    public ResponseEntity<ApiError> handleDataSourceNotFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiError.of("data_source_not_found", "The requested data source does not exist."));
    }

    @ExceptionHandler(WidgetFetchException.class)
    public ResponseEntity<Map<String, Object>> handleWidgetFetch(WidgetFetchException exception) {
        return ResponseEntity.ok(Map.of(
            "fetchError", true,
            "status", exception.httpStatus(),
            "body", exception.body()));
    }

    @ExceptionHandler(DataSourceVersionConflictException.class)
    public ResponseEntity<ApiError> handleDataSourceConflict() {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiError.of(
                "data_source_version_conflict",
                "The data source changed after it was loaded."));
    }

    @ExceptionHandler(DataSourceInUseException.class)
    public ResponseEntity<ApiError> handleDataSourceInUse(DataSourceInUseException exception) {
        var joinedReferences = exception.references().stream()
            .map(reference -> reference.dashboardName() + " / " + reference.widgetTitle())
            .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(new ApiError(
            "data_source_in_use",
            "The data source is still referenced by widgets.",
            Map.of("references", joinedReferences)));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiError> handleUnexpected(RuntimeException exception) {
        LOGGER.error("Unexpected API failure", exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiError.of("internal_error", "An unexpected error occurred."));
    }
}
