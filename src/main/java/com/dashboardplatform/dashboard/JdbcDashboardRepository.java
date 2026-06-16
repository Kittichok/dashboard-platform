package com.dashboardplatform.dashboard;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcDashboardRepository implements DashboardRepository {
    private static final RowMapper<Dashboard> DASHBOARD_ROW_MAPPER =
        JdbcDashboardRepository::mapDashboard;

    private final JdbcTemplate jdbcTemplate;

    public JdbcDashboardRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<Dashboard> findAll() {
        return jdbcTemplate.query("""
            SELECT id, name, description, widgets_json, version, created_at, updated_at
            FROM dashboards
            ORDER BY updated_at DESC
            """, DASHBOARD_ROW_MAPPER);
    }

    @Override
    public Optional<Dashboard> findById(UUID id) {
        var dashboards = jdbcTemplate.query("""
            SELECT id, name, description, widgets_json, version, created_at, updated_at
            FROM dashboards
            WHERE id = ?
            """, DASHBOARD_ROW_MAPPER, id.toString());
        return dashboards.stream().findFirst();
    }

    @Override
    public boolean existsById(UUID id) {
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM dashboards WHERE id = ?",
            Integer.class,
            id.toString());
        return count != null && count > 0;
    }

    @Override
    public void insert(Dashboard dashboard) {
        jdbcTemplate.update("""
            INSERT INTO dashboards (
                id, name, description, widgets_json, version, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            dashboard.id().toString(),
            dashboard.name(),
            dashboard.description(),
            dashboard.widgetsJson(),
            dashboard.version(),
            dashboard.createdAt().toString(),
            dashboard.updatedAt().toString());
    }

    @Override
    public boolean update(Dashboard dashboard, long expectedVersion) {
        return jdbcTemplate.update("""
            UPDATE dashboards
            SET name = ?, description = ?, widgets_json = ?, version = ?, updated_at = ?
            WHERE id = ? AND version = ?
            """,
            dashboard.name(),
            dashboard.description(),
            dashboard.widgetsJson(),
            dashboard.version(),
            dashboard.updatedAt().toString(),
            dashboard.id().toString(),
            expectedVersion) == 1;
    }

    @Override
    public boolean delete(UUID id, long expectedVersion) {
        return jdbcTemplate.update(
            "DELETE FROM dashboards WHERE id = ? AND version = ?",
            id.toString(),
            expectedVersion) == 1;
    }

    private static Dashboard mapDashboard(ResultSet resultSet, int rowNumber) throws SQLException {
        return new Dashboard(
            UUID.fromString(resultSet.getString("id")),
            resultSet.getString("name"),
            resultSet.getString("description"),
            resultSet.getString("widgets_json"),
            resultSet.getLong("version"),
            Instant.parse(resultSet.getString("created_at")),
            Instant.parse(resultSet.getString("updated_at")));
    }
}
