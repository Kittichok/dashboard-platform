package com.dashboardplatform.datasource;

import com.dashboardplatform.datasource.DataSourceRequests.CreateDataSourceRequest;
import com.dashboardplatform.datasource.DataSourceRequests.ImportDataSourceRequest;
import com.dashboardplatform.datasource.DataSourceRequests.UpdateDataSourceRequest;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/data-sources")
public class DataSourceController {
    private final DataSourceService dataSourceService;

    public DataSourceController(DataSourceService dataSourceService) {
        this.dataSourceService = dataSourceService;
    }

    @GetMapping
    public List<DataSourceResponse> listDataSources() {
        return dataSourceService.listDataSources().stream()
            .map(DataSourceResponse::from)
            .toList();
    }

    @PostMapping
    public ResponseEntity<DataSourceResponse> createDataSource(
        @Valid @RequestBody CreateDataSourceRequest request
    ) {
        var dataSource = dataSourceService.createDataSource(request.name(), request.type(), request.config());
        return ResponseEntity.created(URI.create("/api/data-sources/" + dataSource.id()))
            .body(DataSourceResponse.from(dataSource));
    }

    @PatchMapping("/{id}")
    public DataSourceResponse updateDataSource(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateDataSourceRequest request
    ) {
        return DataSourceResponse.from(
            dataSourceService.updateDataSource(id, request.version(), request.name(), request.type(), request.config()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDataSource(@PathVariable UUID id, @RequestParam long version) {
        dataSourceService.deleteDataSource(id, version);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/import")
    public ResponseEntity<DataSourceResponse> importDataSource(
        @Valid @RequestBody ImportDataSourceRequest request
    ) {
        var dataSource = dataSourceService.importDataSource(request.name(), request.type(), request.config());
        return ResponseEntity.created(URI.create("/api/data-sources/" + dataSource.id()))
            .body(DataSourceResponse.from(dataSource));
    }

    @GetMapping("/{id}/export")
    public Map<String, Object> exportDataSource(@PathVariable UUID id) {
        return dataSourceService.exportDataSource(id);
    }
}
