package com.dashboardplatform.widget;

import com.dashboardplatform.dashboard.DashboardVersionConflictException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcWidgetRepository implements WidgetRepository {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    @Autowired
    public JdbcWidgetRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<Widget> findAll(UUID dashboardId) {
        var rows = jdbcTemplate.query(
            "SELECT widgets_json FROM dashboards WHERE id = ?",
            (rs, rowNum) -> rs.getString("widgets_json"),
            dashboardId.toString());
        if (rows.isEmpty() || rows.getFirst() == null) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(rows.getFirst(), new TypeReference<List<Widget>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    @Override
    public void save(UUID dashboardId, long expectedDashboardVersion, List<Widget> widgets) {
        try {
            String widgetsJson = objectMapper.writeValueAsString(widgets);
            int updated = jdbcTemplate.update("""
                UPDATE dashboards
                SET widgets_json = ?, version = version + 1, updated_at = ?
                WHERE id = ? AND version = ?
                """,
                widgetsJson,
                Instant.now().toString(),
                dashboardId.toString(),
                expectedDashboardVersion);
            if (updated == 0) {
                throw new DashboardVersionConflictException(dashboardId);
            }
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize widgets", e);
        }
    }

    @Override
    public boolean dashboardExists(UUID dashboardId) {
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM dashboards WHERE id = ?",
            Integer.class,
            dashboardId.toString());
        return count != null && count > 0;
    }
}
