package com.dashboardplatform.dashboard;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
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
@RequestMapping("/api/dashboards")
public class DashboardController {
    private final DashboardService dashboardService;
    private final ObjectMapper objectMapper;

    @Autowired
    public DashboardController(DashboardService dashboardService) {
        this(dashboardService, new ObjectMapper()
            .findAndRegisterModules()
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS));
    }

    public DashboardController(DashboardService dashboardService, ObjectMapper objectMapper) {
        this.dashboardService = dashboardService;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public List<DashboardResponse> listDashboards() {
        return dashboardService.listDashboards().stream()
            .map(this::response)
            .toList();
    }

    @PostMapping
    public ResponseEntity<DashboardResponse> createDashboard(
        @Valid @RequestBody CreateDashboardRequest request
    ) {
        var dashboard = dashboardService.createDashboard(request.name(), request.description());
        return ResponseEntity.created(location(dashboard.id())).body(response(dashboard));
    }

    @PatchMapping("/{id}")
    public DashboardResponse renameDashboard(
        @PathVariable UUID id,
        @Valid @RequestBody RenameDashboardRequest request
    ) {
        return response(dashboardService.renameDashboard(
            id,
            request.version(),
            request.name(),
            request.description()));
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<DashboardResponse> duplicateDashboard(@PathVariable UUID id) {
        var dashboard = dashboardService.duplicateDashboard(id);
        return ResponseEntity.created(location(dashboard.id())).body(response(dashboard));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDashboard(
        @PathVariable UUID id,
        @RequestParam long version
    ) {
        dashboardService.deleteDashboard(id, version);
        return ResponseEntity.noContent().build();
    }

    private DashboardResponse response(Dashboard dashboard) {
        return DashboardResponse.from(dashboard, objectMapper);
    }

    private URI location(UUID id) {
        return URI.create("/api/dashboards/" + id);
    }
}
