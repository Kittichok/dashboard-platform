package com.dashboardplatform.widget;

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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboards/{dashboardId}/widgets")
public class WidgetController {

    private final WidgetService widgetService;

    @Autowired
    public WidgetController(WidgetService widgetService) {
        this.widgetService = widgetService;
    }

    @GetMapping
    public List<WidgetResponse> listWidgets(@PathVariable UUID dashboardId) {
        return widgetService.listWidgets(dashboardId).stream()
            .map(WidgetResponse::from)
            .toList();
    }

    @PostMapping
    public ResponseEntity<WidgetResponse> addWidget(
        @PathVariable UUID dashboardId,
        @RequestParam long dashboardVersion,
        @Valid @RequestBody WidgetRequests.AddWidgetRequest request
    ) {
        var widget = widgetService.addWidget(
            dashboardId, dashboardVersion,
            request.title(), request.type(),
            request.x(), request.y(), request.w(), request.h(),
            request.displayConfigJson(), request.dataSourceJson());
        return ResponseEntity
            .created(URI.create("/api/dashboards/" + dashboardId + "/widgets/" + widget.id()))
            .body(WidgetResponse.from(widget));
    }

    @PatchMapping("/{widgetId}")
    public WidgetResponse updateWidget(
        @PathVariable UUID dashboardId,
        @PathVariable UUID widgetId,
        @RequestParam long dashboardVersion,
        @Valid @RequestBody WidgetRequests.UpdateWidgetRequest request
    ) {
        return WidgetResponse.from(widgetService.updateWidget(
            dashboardId, widgetId, dashboardVersion,
            request.title(), request.type(),
            request.x(), request.y(), request.w(), request.h(),
            request.displayConfigJson(), request.dataSourceJson()));
    }

    @PutMapping("/order")
    public List<WidgetResponse> reorderWidgets(
        @PathVariable UUID dashboardId,
        @RequestParam long dashboardVersion,
        @Valid @RequestBody WidgetRequests.ReorderWidgetsRequest request
    ) {
        return widgetService.reorderWidgets(dashboardId, dashboardVersion, request.orderedIds())
            .stream()
            .map(WidgetResponse::from)
            .toList();
    }

    @DeleteMapping("/{widgetId}")
    public ResponseEntity<Void> removeWidget(
        @PathVariable UUID dashboardId,
        @PathVariable UUID widgetId,
        @RequestParam long dashboardVersion
    ) {
        widgetService.removeWidget(dashboardId, widgetId, dashboardVersion);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{widgetId}/fetch")
    public ResponseEntity<String> fetchWidgetData(
        @PathVariable UUID dashboardId,
        @PathVariable UUID widgetId
    ) {
        var data = widgetService.fetchWidgetData(dashboardId, widgetId);
        return ResponseEntity.ok(data);
    }
}
