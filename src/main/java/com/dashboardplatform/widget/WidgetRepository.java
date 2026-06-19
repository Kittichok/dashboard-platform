package com.dashboardplatform.widget;

import java.util.List;
import java.util.UUID;

public interface WidgetRepository {
    List<Widget> findAll(UUID dashboardId);

    void save(UUID dashboardId, long expectedDashboardVersion, List<Widget> widgets);

    boolean dashboardExists(UUID dashboardId);
}
