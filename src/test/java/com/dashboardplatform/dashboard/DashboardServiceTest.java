package com.dashboardplatform.dashboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;

class DashboardServiceTest {

    private static final Instant NOW = Instant.parse("2026-06-15T12:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    @Test
    void createDashboardTrimsInputGeneratesUuidStartsAtVersionOneAndStoresEmptyWidgetsJson() {
        var repository = new InMemoryDashboardRepository();
        var createdId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        var service = new DashboardService(repository, CLOCK, uuidSequence(createdId));

        var dashboard = service.createDashboard("  Service Operations  ", "  Incidents and platform health  ");

        assertEquals(createdId, dashboard.id());
        assertEquals("Service Operations", dashboard.name());
        assertEquals("Incidents and platform health", dashboard.description());
        assertEquals("[]", dashboard.widgetsJson());
        assertEquals(1L, dashboard.version());
        assertEquals(NOW, dashboard.createdAt());
        assertEquals(NOW, dashboard.updatedAt());
        assertEquals(dashboard, repository.findById(createdId).orElseThrow());
    }

    @Test
    void createDashboardRejectsBlankAndOverlongNamesWithNameFieldErrors() {
        var service = new DashboardService(new InMemoryDashboardRepository(), CLOCK, uuidSequence(
            UUID.fromString("11111111-1111-1111-1111-111111111111")));

        var blankName = assertThrows(
            DashboardValidationException.class,
            () -> service.createDashboard("   ", ""));
        assertSingleFieldError(blankName, "name");

        var overlongName = assertThrows(
            DashboardValidationException.class,
            () -> service.createDashboard("x".repeat(121), ""));
        assertSingleFieldError(overlongName, "name");
    }

    @Test
    void createDashboardRejectsOverlongDescriptionsWithDescriptionFieldErrors() {
        var service = new DashboardService(new InMemoryDashboardRepository(), CLOCK, uuidSequence(
            UUID.fromString("11111111-1111-1111-1111-111111111111")));

        var exception = assertThrows(
            DashboardValidationException.class,
            () -> service.createDashboard("Service Operations", "x".repeat(501)));

        assertSingleFieldError(exception, "description");
    }

    @Test
    void renameDashboardTrimsValuesAndIncrementsVersion() {
        var repository = new InMemoryDashboardRepository();
        var dashboard = dashboard(
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Service Operations",
            "Incidents and platform health",
            "[{\"id\":\"widget-1\"}]",
            1L,
            Instant.parse("2026-06-15T11:00:00Z"),
            Instant.parse("2026-06-15T11:00:00Z"));
        repository.insert(dashboard);
        var service = new DashboardService(repository, CLOCK, uuidSequence(
            UUID.fromString("22222222-2222-2222-2222-222222222222")));

        var renamed = service.renameDashboard(
            dashboard.id(),
            dashboard.version(),
            "  Service Operations Copy  ",
            "  Updated dashboard description  ");

        assertEquals("Service Operations Copy", renamed.name());
        assertEquals("Updated dashboard description", renamed.description());
        assertEquals(dashboard.widgetsJson(), renamed.widgetsJson());
        assertEquals(2L, renamed.version());
        assertEquals(dashboard.createdAt(), renamed.createdAt());
        assertEquals(NOW, renamed.updatedAt());
        assertEquals(renamed, repository.findById(dashboard.id()).orElseThrow());
    }

    @Test
    void duplicateDashboardCreatesNewIdAppendsCopyPreservesDescriptionAndWidgetsAndResetsVersion() {
        var repository = new InMemoryDashboardRepository();
        var source = dashboard(
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Service Operations",
            "Incidents and platform health",
            "[{\"id\":\"widget-1\"}]",
            7L,
            Instant.parse("2026-06-15T10:00:00Z"),
            Instant.parse("2026-06-15T11:00:00Z"));
        repository.insert(source);
        var duplicateId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        var service = new DashboardService(repository, CLOCK, uuidSequence(duplicateId));

        var duplicate = service.duplicateDashboard(source.id());

        assertEquals(duplicateId, duplicate.id());
        assertNotEquals(source.id(), duplicate.id());
        assertEquals("Service Operations Copy", duplicate.name());
        assertEquals(source.description(), duplicate.description());
        assertEquals(source.widgetsJson(), duplicate.widgetsJson());
        assertEquals(source.variableStateJson(), duplicate.variableStateJson());
        assertEquals(1L, duplicate.version());
        assertEquals(NOW, duplicate.createdAt());
        assertEquals(NOW, duplicate.updatedAt());
        assertEquals(duplicate, repository.findById(duplicateId).orElseThrow());
    }

    @Test
    void updateVariableStatePersistsValuesAndIncrementsVersion() {
        var repository = new InMemoryDashboardRepository();
        var stored = dashboard(
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Service Operations",
            "Incidents and platform health",
            "[]",
            2L,
            Instant.parse("2026-06-15T10:00:00Z"),
            Instant.parse("2026-06-15T11:00:00Z"));
        repository.insert(stored);
        var service = new DashboardService(repository, CLOCK, uuidSequence(
            UUID.fromString("22222222-2222-2222-2222-222222222222")));

        var updated = service.updateVariableState(
            stored.id(),
            stored.version(),
            Map.of("region", "us-east-1", "from", "2026-06-19T09:30"));

        assertEquals(3L, updated.version());
        assertTrue(updated.variableStateJson().contains("\"region\":\"us-east-1\""));
        assertTrue(updated.variableStateJson().contains("\"from\":\"2026-06-19T09:30\""));
        assertEquals(updated, repository.findById(stored.id()).orElseThrow());
    }

    @Test
    void renameDashboardRejectsStaleVersionsWithoutChangingStoredDashboard() {
        var repository = new InMemoryDashboardRepository();
        var stored = dashboard(
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Service Operations",
            "Incidents and platform health",
            "[{\"id\":\"widget-1\"}]",
            2L,
            Instant.parse("2026-06-15T10:00:00Z"),
            Instant.parse("2026-06-15T11:00:00Z"));
        repository.insert(stored);
        var service = new DashboardService(repository, CLOCK, uuidSequence(
            UUID.fromString("22222222-2222-2222-2222-222222222222")));

        assertThrows(
            DashboardVersionConflictException.class,
            () -> service.renameDashboard(stored.id(), 1L, "Renamed", stored.description()));

        assertEquals(stored, repository.findById(stored.id()).orElseThrow());
    }

    @Test
    void deleteDashboardRejectsStaleVersionsWithoutChangingStoredDashboard() {
        var repository = new InMemoryDashboardRepository();
        var stored = dashboard(
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Service Operations",
            "Incidents and platform health",
            "[{\"id\":\"widget-1\"}]",
            3L,
            Instant.parse("2026-06-15T10:00:00Z"),
            Instant.parse("2026-06-15T11:00:00Z"));
        repository.insert(stored);
        var service = new DashboardService(repository, CLOCK, uuidSequence(
            UUID.fromString("22222222-2222-2222-2222-222222222222")));

        assertThrows(
            DashboardVersionConflictException.class,
            () -> service.deleteDashboard(stored.id(), 2L));

        assertTrue(repository.existsById(stored.id()));
        assertEquals(stored, repository.findById(stored.id()).orElseThrow());
    }

    @Test
    void renameDashboardThrowsNotFoundWhenDashboardDoesNotExist() {
        var repository = new InMemoryDashboardRepository();
        var service = new DashboardService(repository, CLOCK, uuidSequence(
            UUID.fromString("11111111-1111-1111-1111-111111111111")));

        assertThrows(
            DashboardNotFoundException.class,
            () -> service.renameDashboard(
                UUID.fromString("99999999-9999-9999-9999-999999999999"),
                1L,
                "Missing",
                ""));
    }

    @Test
    void duplicateDashboardThrowsNotFoundWhenSourceDashboardDoesNotExist() {
        var repository = new InMemoryDashboardRepository();
        var service = new DashboardService(repository, CLOCK, uuidSequence(
            UUID.fromString("11111111-1111-1111-1111-111111111111")));

        assertThrows(
            DashboardNotFoundException.class,
            () -> service.duplicateDashboard(
                UUID.fromString("99999999-9999-9999-9999-999999999999")));
    }

    private Supplier<UUID> uuidSequence(UUID... ids) {
        var remaining = new ArrayList<>(List.of(ids));
        return () -> {
            if (remaining.isEmpty()) {
                throw new IllegalStateException("No more UUIDs available for test");
            }
            return remaining.removeFirst();
        };
    }

    private Dashboard dashboard(
        UUID id,
        String name,
        String description,
        String widgetsJson,
        long version,
        Instant createdAt,
        Instant updatedAt
    ) {
        return new Dashboard(id, name, description, widgetsJson, "{}", version, createdAt, updatedAt);
    }

    private void assertSingleFieldError(DashboardValidationException exception, String fieldName) {
        assertEquals(1, exception.fieldErrors().size());
        assertTrue(exception.fieldErrors().containsKey(fieldName));
        assertFalse(exception.fieldErrors().get(fieldName).isBlank());
    }

    private static final class InMemoryDashboardRepository implements DashboardRepository {

        private final Map<UUID, Dashboard> dashboards = new LinkedHashMap<>();

        @Override
        public List<Dashboard> findAll() {
            return dashboards.values().stream()
                .sorted(Comparator.comparing(Dashboard::updatedAt).reversed())
                .toList();
        }

        @Override
        public Optional<Dashboard> findById(UUID id) {
            return Optional.ofNullable(dashboards.get(id));
        }

        @Override
        public boolean existsById(UUID id) {
            return dashboards.containsKey(id);
        }

        @Override
        public void insert(Dashboard dashboard) {
            dashboards.put(dashboard.id(), dashboard);
        }

        @Override
        public boolean update(Dashboard dashboard, long expectedVersion) {
            var existing = dashboards.get(dashboard.id());
            if (existing == null || existing.version() != expectedVersion) {
                return false;
            }
            dashboards.put(dashboard.id(), dashboard);
            return true;
        }

        @Override
        public boolean delete(UUID id, long expectedVersion) {
            var existing = dashboards.get(id);
            if (existing == null || existing.version() != expectedVersion) {
                return false;
            }
            dashboards.remove(id);
            return true;
        }
    }
}
