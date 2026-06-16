package com.dashboardplatform.dashboard;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.Mockito.mock;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.dashboardplatform.web.ApiExceptionHandler;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class DashboardControllerTest {

    private MockMvc mockMvc;

    private DashboardService dashboardService;

    @BeforeEach
    void setUp() {
        dashboardService = mock(DashboardService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new DashboardController(dashboardService))
            .setControllerAdvice(new ApiExceptionHandler())
            .build();
    }

    @Test
    void getDashboardsReturnsDashboardSummaries() throws Exception {
        var first = dashboard(
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Operations",
            "Platform health",
            "[{\"id\":\"widget-1\",\"title\":\"Latency\"}]",
            3L,
            Instant.parse("2026-06-15T09:30:00Z"),
            Instant.parse("2026-06-15T12:00:00Z"));
        var second = dashboard(
            UUID.fromString("22222222-2222-2222-2222-222222222222"),
            "Finance",
            "",
            "[]",
            1L,
            Instant.parse("2026-06-14T09:30:00Z"),
            Instant.parse("2026-06-15T08:00:00Z"));
        given(dashboardService.listDashboards()).willReturn(List.of(first, second));

        mockMvc.perform(get("/api/dashboards"))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
            .andExpect(jsonPath("$[0].id").value(first.id().toString()))
            .andExpect(jsonPath("$[0].name").value("Operations"))
            .andExpect(jsonPath("$[0].description").value("Platform health"))
            .andExpect(jsonPath("$[0].widgets[0].id").value("widget-1"))
            .andExpect(jsonPath("$[0].widgets[0].title").value("Latency"))
            .andExpect(jsonPath("$[0].version").value(3))
            .andExpect(jsonPath("$[0].createdAt").value("2026-06-15T09:30:00Z"))
            .andExpect(jsonPath("$[0].updatedAt").value("2026-06-15T12:00:00Z"))
            .andExpect(jsonPath("$[1].id").value(second.id().toString()))
            .andExpect(jsonPath("$[1].widgets").isArray())
            .andExpect(jsonPath("$[1].widgets").isEmpty());
    }

    @Test
    void postDashboardsReturnsCreatedDashboardAndLocationHeader() throws Exception {
        var created = dashboard(
            UUID.fromString("33333333-3333-3333-3333-333333333333"),
            "Operations",
            "Platform health",
            "[]",
            1L,
            Instant.parse("2026-06-15T12:00:00Z"),
            Instant.parse("2026-06-15T12:00:00Z"));
        given(dashboardService.createDashboard("Operations", "Platform health")).willReturn(created);

        mockMvc.perform(post("/api/dashboards")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "name": "Operations",
                      "description": "Platform health"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(header().string("Location", "/api/dashboards/" + created.id()))
            .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
            .andExpect(jsonPath("$.id").value(created.id().toString()))
            .andExpect(jsonPath("$.version").value(1));
    }

    @Test
    void patchDashboardReturnsRenamedDashboardWithIncrementedVersion() throws Exception {
        var id = UUID.fromString("11111111-1111-1111-1111-111111111111");
        var renamed = dashboard(
            id,
            "Operations Copy",
            "Updated description",
            "[{\"id\":\"widget-1\"}]",
            2L,
            Instant.parse("2026-06-15T09:30:00Z"),
            Instant.parse("2026-06-15T12:30:00Z"));
        given(dashboardService.renameDashboard(id, 1L, "Operations Copy", "Updated description"))
            .willReturn(renamed);

        mockMvc.perform(patch("/api/dashboards/{id}", id)
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "name": "Operations Copy",
                      "description": "Updated description",
                      "version": 1
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
            .andExpect(jsonPath("$.id").value(id.toString()))
            .andExpect(jsonPath("$.name").value("Operations Copy"))
            .andExpect(jsonPath("$.description").value("Updated description"))
            .andExpect(jsonPath("$.version").value(2));
    }

    @Test
    void duplicateDashboardReturnsCreatedDashboardAndLocationHeader() throws Exception {
        var sourceId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        var duplicate = dashboard(
            UUID.fromString("44444444-4444-4444-4444-444444444444"),
            "Operations Copy",
            "Platform health",
            "[{\"id\":\"widget-1\"}]",
            1L,
            Instant.parse("2026-06-15T12:00:00Z"),
            Instant.parse("2026-06-15T12:00:00Z"));
        given(dashboardService.duplicateDashboard(sourceId)).willReturn(duplicate);

        mockMvc.perform(post("/api/dashboards/{id}/duplicate", sourceId))
            .andExpect(status().isCreated())
            .andExpect(header().string("Location", "/api/dashboards/" + duplicate.id()))
            .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
            .andExpect(jsonPath("$.id").value(duplicate.id().toString()))
            .andExpect(jsonPath("$.name").value("Operations Copy"))
            .andExpect(jsonPath("$.version").value(1));
    }

    @Test
    void deleteDashboardReturnsNoContentWhenVersionMatches() throws Exception {
        var id = UUID.fromString("11111111-1111-1111-1111-111111111111");
        willDoNothing().given(dashboardService).deleteDashboard(id, 7L);

        mockMvc.perform(delete("/api/dashboards/{id}", id).queryParam("version", "7"))
            .andExpect(status().isNoContent())
            .andExpect(content().string(""));
    }

    @Test
    void validationErrorsReturnStableJsonBody() throws Exception {
        var errors = new LinkedHashMap<String, String>();
        errors.put("name", "Dashboard name is required.");
        errors.put("description", "Description must be at most 500 characters.");
        given(dashboardService.createDashboard(any(), any()))
            .willThrow(new DashboardValidationException(errors));

        mockMvc.perform(post("/api/dashboards")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "name": "",
                      "description": "%s"
                    }
                    """.formatted("x".repeat(501))))
            .andExpect(status().isBadRequest())
            .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
            .andExpect(content().json("""
                {
                  "code": "validation_error",
                  "message": "Validation failed.",
                  "fieldErrors": {
                    "name": "Dashboard name is required.",
                    "description": "Description must be at most 500 characters."
                  }
                }
                """, JsonCompareMode.STRICT));
    }

    @Test
    void missingDashboardsReturnNotFoundError() throws Exception {
        var id = UUID.fromString("99999999-9999-9999-9999-999999999999");
        given(dashboardService.duplicateDashboard(id)).willThrow(new DashboardNotFoundException(id));

        mockMvc.perform(post("/api/dashboards/{id}/duplicate", id))
            .andExpect(status().isNotFound())
            .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
            .andExpect(content().json("""
                {
                  "code": "dashboard_not_found",
                  "message": "The requested dashboard does not exist.",
                  "fieldErrors": {}
                }
                """, JsonCompareMode.STRICT));
    }

    @Test
    void staleMutationsReturnConflictError() throws Exception {
        var id = UUID.fromString("11111111-1111-1111-1111-111111111111");
        given(dashboardService.renameDashboard(eq(id), eq(3L), eq("Operations"), eq("Platform health")))
            .willThrow(new DashboardVersionConflictException(id));

        mockMvc.perform(patch("/api/dashboards/{id}", id)
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "name": "Operations",
                      "description": "Platform health",
                      "version": 3
                    }
                    """))
            .andExpect(status().isConflict())
            .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
            .andExpect(content().json("""
                {
                  "code": "dashboard_version_conflict",
                  "message": "The dashboard changed after it was loaded.",
                  "fieldErrors": {}
                }
                """, JsonCompareMode.STRICT));
    }

    @Test
    void unexpectedErrorsReturnSanitizedInternalServerError() throws Exception {
        given(dashboardService.createDashboard("Operations", "Platform health"))
            .willThrow(new RuntimeException("database connection refused"));

        mockMvc.perform(post("/api/dashboards")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "name": "Operations",
                      "description": "Platform health"
                    }
                    """))
            .andExpect(status().isInternalServerError())
            .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
            .andExpect(content().json("""
                {
                  "code": "internal_error",
                  "message": "An unexpected error occurred.",
                  "fieldErrors": {}
                }
                """, JsonCompareMode.STRICT))
            .andExpect(jsonPath("$.message").value("An unexpected error occurred."));
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
        return new Dashboard(id, name, description, widgetsJson, version, createdAt, updatedAt);
    }
}
