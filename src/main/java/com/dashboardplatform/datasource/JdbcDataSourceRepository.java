package com.dashboardplatform.datasource;

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
public class JdbcDataSourceRepository implements DataSourceRepository {
    private static final RowMapper<DataSource> DATA_SOURCE_ROW_MAPPER =
        JdbcDataSourceRepository::mapDataSource;

    private final JdbcTemplate jdbcTemplate;

    public JdbcDataSourceRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<DataSource> findAll() {
        return jdbcTemplate.query("""
            SELECT id, name, type, config_json, version, created_at, updated_at
            FROM data_sources
            ORDER BY updated_at DESC
            """, DATA_SOURCE_ROW_MAPPER);
    }

    @Override
    public Optional<DataSource> findById(UUID id) {
        var rows = jdbcTemplate.query("""
            SELECT id, name, type, config_json, version, created_at, updated_at
            FROM data_sources
            WHERE id = ?
            """, DATA_SOURCE_ROW_MAPPER, id.toString());
        return rows.stream().findFirst();
    }

    @Override
    public void insert(DataSource dataSource) {
        jdbcTemplate.update("""
            INSERT INTO data_sources (
                id, name, type, config_json, version, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            dataSource.id().toString(),
            dataSource.name(),
            dataSource.type(),
            dataSource.configJson(),
            dataSource.version(),
            dataSource.createdAt().toString(),
            dataSource.updatedAt().toString());
    }

    @Override
    public boolean update(DataSource dataSource, long expectedVersion) {
        return jdbcTemplate.update("""
            UPDATE data_sources
            SET name = ?, type = ?, config_json = ?, version = ?, updated_at = ?
            WHERE id = ? AND version = ?
            """,
            dataSource.name(),
            dataSource.type(),
            dataSource.configJson(),
            dataSource.version(),
            dataSource.updatedAt().toString(),
            dataSource.id().toString(),
            expectedVersion) == 1;
    }

    @Override
    public boolean delete(UUID id, long expectedVersion) {
        return jdbcTemplate.update(
            "DELETE FROM data_sources WHERE id = ? AND version = ?",
            id.toString(),
            expectedVersion) == 1;
    }

    @Override
    public boolean existsById(UUID id) {
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM data_sources WHERE id = ?",
            Integer.class,
            id.toString());
        return count != null && count > 0;
    }

    private static DataSource mapDataSource(ResultSet resultSet, int rowNum) throws SQLException {
        return new DataSource(
            UUID.fromString(resultSet.getString("id")),
            resultSet.getString("name"),
            resultSet.getString("type"),
            resultSet.getString("config_json"),
            resultSet.getLong("version"),
            Instant.parse(resultSet.getString("created_at")),
            Instant.parse(resultSet.getString("updated_at")));
    }
}
