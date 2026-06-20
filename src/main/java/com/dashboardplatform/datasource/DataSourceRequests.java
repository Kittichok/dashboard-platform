package com.dashboardplatform.datasource;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Map;

public final class DataSourceRequests {

    private DataSourceRequests() {
    }

    public record CreateDataSourceRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank String type,
        @NotNull Map<String, Object> config
    ) {
    }

    public record UpdateDataSourceRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank String type,
        @NotNull Map<String, Object> config,
        long version
    ) {
    }

    public record ImportDataSourceRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank String type,
        @NotNull Map<String, Object> config
    ) {
    }
}
