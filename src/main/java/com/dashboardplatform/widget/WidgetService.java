package com.dashboardplatform.widget;

import com.dashboardplatform.dashboard.DashboardNotFoundException;
import com.dashboardplatform.dashboard.DashboardVersionConflictException;
import com.dashboardplatform.widget.WidgetExceptions.WidgetFetchException;
import com.dashboardplatform.widget.WidgetExceptions.WidgetNotFoundException;
import com.dashboardplatform.widget.WidgetExceptions.WidgetValidationException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class WidgetService {

    private static final int MAX_TITLE_LENGTH = 120;

    private final WidgetRepository widgetRepository;
    private final RestClient restClient;
    private final Supplier<UUID> uuidSupplier;

    @Autowired
    public WidgetService(WidgetRepository widgetRepository) {
        this(widgetRepository, RestClient.builder().build(), UUID::randomUUID);
    }

    WidgetService(WidgetRepository widgetRepository, RestClient restClient, Supplier<UUID> uuidSupplier) {
        this.widgetRepository = widgetRepository;
        this.restClient = restClient;
        this.uuidSupplier = uuidSupplier;
    }

    public List<Widget> listWidgets(UUID dashboardId) {
        return widgetRepository.findAll(dashboardId);
    }

    public Widget addWidget(UUID dashboardId, long dashboardVersion, String title, WidgetType type,
                            int x, int y, int w, int h, String displayConfigJson, String dataSourceJson) {
        var errors = validate(title, type, w, h);
        if (!errors.isEmpty()) {
            throw new WidgetValidationException(errors);
        }
        ensureDashboardExists(dashboardId);
        var widgets = new ArrayList<>(widgetRepository.findAll(dashboardId));
        var widget = new Widget(
            uuidSupplier.get(), title, type, x, y, w, h, displayConfigJson, dataSourceJson);
        widgets.add(widget);
        widgetRepository.save(dashboardId, dashboardVersion, widgets);
        return widget;
    }

    public Widget updateWidget(UUID dashboardId, UUID widgetId, long dashboardVersion,
                               String title, WidgetType type, int x, int y, int w, int h,
                               String displayConfigJson, String dataSourceJson) {
        var errors = validate(title, type, w, h);
        if (!errors.isEmpty()) {
            throw new WidgetValidationException(errors);
        }
        ensureDashboardExists(dashboardId);
        var widgets = new ArrayList<>(widgetRepository.findAll(dashboardId));
        var index = -1;
        for (int i = 0; i < widgets.size(); i++) {
            if (widgets.get(i).id().equals(widgetId)) {
                index = i;
                break;
            }
        }
        if (index == -1) {
            throw new WidgetNotFoundException(dashboardId, widgetId);
        }
        var updated = new Widget(
            widgetId, title, type, x, y, w, h, displayConfigJson, dataSourceJson);
        widgets.set(index, updated);
        widgetRepository.save(dashboardId, dashboardVersion, widgets);
        return updated;
    }

    public List<Widget> reorderWidgets(UUID dashboardId, long dashboardVersion, List<UUID> orderedIds) {
        ensureDashboardExists(dashboardId);
        var currentWidgets = new ArrayList<>(widgetRepository.findAll(dashboardId));
        var widgetMap = new LinkedHashMap<UUID, Widget>();
        for (var w : currentWidgets) {
            widgetMap.put(w.id(), w);
        }
        for (var id : orderedIds) {
            if (!widgetMap.containsKey(id)) {
                var errors = new LinkedHashMap<String, String>();
                errors.put("orderedIds", "Widget not found: " + id);
                throw new WidgetValidationException(errors);
            }
        }
        var reordered = new ArrayList<Widget>();
        for (var id : orderedIds) {
            reordered.add(widgetMap.get(id));
        }
        widgetRepository.save(dashboardId, dashboardVersion, reordered);
        return reordered;
    }

    public void removeWidget(UUID dashboardId, UUID widgetId, long dashboardVersion) {
        ensureDashboardExists(dashboardId);
        var widgets = new ArrayList<>(widgetRepository.findAll(dashboardId));
        var removed = widgets.removeIf(w -> w.id().equals(widgetId));
        if (!removed) {
            throw new WidgetNotFoundException(dashboardId, widgetId);
        }
        widgetRepository.save(dashboardId, dashboardVersion, widgets);
    }

    public String fetchWidgetData(UUID dashboardId, UUID widgetId) {
        ensureDashboardExists(dashboardId);
        var widgets = widgetRepository.findAll(dashboardId);
        var widget = widgets.stream()
            .filter(w -> w.id().equals(widgetId))
            .findFirst()
            .orElseThrow(() -> new WidgetNotFoundException(dashboardId, widgetId));
        if (widget.dataSourceJson() == null || widget.dataSourceJson().isBlank()) {
            var errors = new LinkedHashMap<String, String>();
            errors.put("dataSource", "Widget has no data source configured.");
            throw new WidgetValidationException(errors);
        }
        return executeFetch(widget.dataSourceJson());
    }

    private String executeFetch(String dataSourceJson) {
        try {
            var ds = parseDataSource(dataSourceJson);
            var method = "POST".equalsIgnoreCase(ds.method()) ? HttpMethod.POST : HttpMethod.GET;
            var request = restClient.method(method)
                .uri(ds.url())
                .headers(headers -> {
                    if (ds.headers() != null) {
                        ds.headers().forEach(headers::set);
                    }
                });
            if (method == HttpMethod.POST && ds.body() != null && !ds.body().isBlank()) {
                request = request.body(ds.body());
            }
            var response = request.retrieve().toEntity(String.class);
            return response.getBody();
        } catch (WidgetFetchException e) {
            throw e;
        } catch (Exception e) {
            throw new WidgetFetchException(500, e.getMessage());
        }
    }

    private DataSource parseDataSource(String dataSourceJson) {
        // Simple JSON parsing without Jackson dependency in service
        // Data source shape: { "type":"rest", "url":"...", "method":"GET|POST", "headers":{}, "body":null }
        try {
            var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.readValue(dataSourceJson, DataSource.class);
        } catch (Exception e) {
            throw new WidgetFetchException(400, "Invalid data source configuration");
        }
    }

    private void ensureDashboardExists(UUID dashboardId) {
        if (!widgetRepository.dashboardExists(dashboardId)) {
            throw new DashboardNotFoundException(dashboardId);
        }
    }

    private Map<String, String> validate(String title, WidgetType type, int w, int h) {
        var errors = new LinkedHashMap<String, String>();
        if (title == null || title.trim().isEmpty()) {
            errors.put("title", "Title is required.");
        } else if (title.trim().length() > MAX_TITLE_LENGTH) {
            errors.put("title", "Title must be at most " + MAX_TITLE_LENGTH + " characters.");
        }
        if (type == null) {
            errors.put("type", "Type is required.");
        }
        if (w < 1) {
            errors.put("w", "Width must be at least 1.");
        }
        if (h < 1) {
            errors.put("h", "Height must be at least 1.");
        }
        return errors;
    }

    private record DataSource(String type, String url, String method, Map<String, String> headers, String body) {
    }
}
