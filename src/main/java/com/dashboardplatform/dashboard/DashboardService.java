package com.dashboardplatform.dashboard;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {
    private static final int MAX_NAME_LENGTH = 120;
    private static final int MAX_DESCRIPTION_LENGTH = 500;

    private final DashboardRepository repository;
    private final Clock clock;
    private final Supplier<UUID> uuidSupplier;

    @Autowired
    public DashboardService(DashboardRepository repository) {
        this(repository, Clock.systemUTC(), UUID::randomUUID);
    }

    DashboardService(DashboardRepository repository, Clock clock, Supplier<UUID> uuidSupplier) {
        this.repository = repository;
        this.clock = clock;
        this.uuidSupplier = uuidSupplier;
    }

    public Dashboard createDashboard(String name, String description) {
        var values = validate(name, description);
        var now = clock.instant();
        var dashboard = new Dashboard(
            uuidSupplier.get(),
            values.name(),
            values.description(),
            "[]",
            1L,
            now,
            now);
        repository.insert(dashboard);
        return dashboard;
    }

    public Dashboard renameDashboard(
        UUID id,
        long expectedVersion,
        String name,
        String description
    ) {
        var existing = findDashboard(id);
        var values = validate(name, description);
        var renamed = new Dashboard(
            existing.id(),
            values.name(),
            values.description(),
            existing.widgetsJson(),
            existing.version() + 1,
            existing.createdAt(),
            clock.instant());
        if (!repository.update(renamed, expectedVersion)) {
            throw writeFailure(id);
        }
        return renamed;
    }

    public Dashboard duplicateDashboard(UUID id) {
        var source = findDashboard(id);
        var now = clock.instant();
        var duplicate = new Dashboard(
            uuidSupplier.get(),
            copyName(source.name()),
            source.description(),
            source.widgetsJson(),
            1L,
            now,
            now);
        repository.insert(duplicate);
        return duplicate;
    }

    public void deleteDashboard(UUID id, long expectedVersion) {
        if (!repository.delete(id, expectedVersion)) {
            throw writeFailure(id);
        }
    }

    List<Dashboard> listDashboards() {
        return repository.findAll();
    }

    Dashboard findDashboard(UUID id) {
        return repository.findById(id)
            .orElseThrow(() -> new DashboardNotFoundException(id));
    }

    private RuntimeException writeFailure(UUID id) {
        if (!repository.existsById(id)) {
            return new DashboardNotFoundException(id);
        }
        return new DashboardVersionConflictException(id);
    }

    private DashboardValues validate(String name, String description) {
        var trimmedName = name == null ? "" : name.trim();
        var trimmedDescription = description == null ? "" : description.trim();
        var errors = new LinkedHashMap<String, String>();
        if (trimmedName.isEmpty()) {
            errors.put("name", "Dashboard name is required.");
        } else if (trimmedName.length() > MAX_NAME_LENGTH) {
            errors.put("name", "Dashboard name must be at most 120 characters.");
        }
        if (trimmedDescription.length() > MAX_DESCRIPTION_LENGTH) {
            errors.put("description", "Description must be at most 500 characters.");
        }
        if (!errors.isEmpty()) {
            throw new DashboardValidationException(errors);
        }
        return new DashboardValues(trimmedName, trimmedDescription);
    }

    private String copyName(String sourceName) {
        var maximumSourceLength = MAX_NAME_LENGTH - " Copy".length();
        var base = sourceName.length() > maximumSourceLength
            ? sourceName.substring(0, maximumSourceLength).stripTrailing()
            : sourceName;
        return base + " Copy";
    }

    private record DashboardValues(String name, String description) {
    }
}
