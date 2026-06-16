package com.dashboardplatform.dashboard;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DashboardRepository {
    List<Dashboard> findAll();

    Optional<Dashboard> findById(UUID id);

    boolean existsById(UUID id);

    void insert(Dashboard dashboard);

    boolean update(Dashboard dashboard, long expectedVersion);

    boolean delete(UUID id, long expectedVersion);
}
