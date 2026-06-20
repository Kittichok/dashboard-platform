package com.dashboardplatform.datasource;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DataSourceRepository {
    List<DataSource> findAll();

    Optional<DataSource> findById(UUID id);

    void insert(DataSource dataSource);

    boolean update(DataSource dataSource, long expectedVersion);

    boolean delete(UUID id, long expectedVersion);

    boolean existsById(UUID id);
}
