package com.dashboardplatform.web;

import com.dashboardplatform.dashboard.DashboardNotFoundException;
import com.dashboardplatform.dashboard.DashboardValidationException;
import com.dashboardplatform.dashboard.DashboardVersionConflictException;
import java.util.LinkedHashMap;
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

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiError> handleUnexpected(RuntimeException exception) {
        LOGGER.error("Unexpected API failure", exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiError.of("internal_error", "An unexpected error occurred."));
    }
}
