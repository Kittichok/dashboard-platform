package com.dashboardplatform.datasource;

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

import com.dashboardplatform.datasource.DataSourceExceptions.DataSourceInUseException;
import com.dashboardplatform.datasource.DataSourceExceptions.DataSourceNotFoundException;
import com.dashboardplatform.datasource.DataSourceExceptions.DataSourceValidationException;
import com.dashboardplatform.datasource.DataSourceExceptions.DataSourceVersionConflictException;
import com.dashboardplatform.web.ApiExceptionHandler;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class DataSourceControllerTest {

    private MockMvc mockMvc;
    private DataSourceService dataSourceService;

    @BeforeEach
    void setUp() {
        dataSourceService = mock(DataSourceService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new DataSourceController(dataSourceService))
            .setControllerAdvice(new ApiExceptionHandler())
            .build();
    }

    @Test
    void get_data_sources_returns_workspace_list() throws Exception {
        var source = dataSource(
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Orders API",
            """
                {"baseUrl":"https://api.example.test","authentication":{"type":"none"}}
                """,
            2L,
            Instant.parse("2026-06-20T09:00:00Z"),
            Instant.parse("2026-06-20T10:00:00Z"));
        given(dataSourceService.listDataSources()).willReturn(List.of(source));

        mockMvc.perform(get("/api/data-sources"))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
            .andExpect(jsonPath("$[0].id").value(source.id().toString()))
            .andExpect(jsonPath("$[0].name").value("Orders API"))
            .andExpect(jsonPath("$[0].config.baseUrl").value("https://api.example.test"))
            .andExpect(jsonPath("$[0].version").value(2));
    }

    @Test
    void post_data_sources_returns_created_source() throws Exception {
        var source = dataSource(
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Orders API",
            """
                {"baseUrl":"https://api.example.test","authentication":{"type":"none"}}
                """,
            1L,
            Instant.parse("2026-06-20T09:00:00Z"),
            Instant.parse("2026-06-20T09:00:00Z"));
        given(dataSourceService.createDataSource(
            eq("Orders API"),
            eq("rest"),
            eq(Map.of(
                "baseUrl", "https://api.example.test",
                "authentication", Map.of("type", "none")))))
            .willReturn(source);

        mockMvc.perform(post("/api/data-sources")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "name": "Orders API",
                      "type": "rest",
                      "config": {
                        "baseUrl": "https://api.example.test",
                        "authentication": {
                          "type": "none"
                        }
                      }
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(header().string("Location", "/api/data-sources/" + source.id()))
            .andExpect(jsonPath("$.version").value(1));
    }

    @Test
    void patch_data_sources_returns_updated_source() throws Exception {
        var id = UUID.fromString("11111111-1111-1111-1111-111111111111");
        var source = dataSource(
            id,
            "Orders API V2",
            """
                {"baseUrl":"https://api.example.test/v2","authentication":{"type":"none"}}
                """,
            2L,
            Instant.parse("2026-06-20T09:00:00Z"),
            Instant.parse("2026-06-20T10:00:00Z"));
        given(dataSourceService.updateDataSource(
            eq(id),
            eq(1L),
            eq("Orders API V2"),
            eq("rest"),
            eq(Map.of(
                "baseUrl", "https://api.example.test/v2",
                "authentication", Map.of("type", "none")))))
            .willReturn(source);

        mockMvc.perform(patch("/api/data-sources/{id}", id)
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "name": "Orders API V2",
                      "type": "rest",
                      "config": {
                        "baseUrl": "https://api.example.test/v2",
                        "authentication": {
                          "type": "none"
                        }
                      },
                      "version": 1
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Orders API V2"))
            .andExpect(jsonPath("$.version").value(2));
    }

    @Test
    void import_and_export_data_source_round_trip_json() throws Exception {
        var source = dataSource(
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Orders API",
            """
                {"baseUrl":"https://api.example.test","authentication":{"type":"none"}}
                """,
            1L,
            Instant.parse("2026-06-20T09:00:00Z"),
            Instant.parse("2026-06-20T09:00:00Z"));
        given(dataSourceService.importDataSource(
            eq("Orders API"),
            eq("rest"),
            eq(Map.of(
                "baseUrl", "https://api.example.test",
                "authentication", Map.of("type", "none")))))
            .willReturn(source);
        given(dataSourceService.exportDataSource(source.id())).willReturn(Map.of(
            "name", "Orders API",
            "type", "rest",
            "config", Map.of(
                "baseUrl", "https://api.example.test",
                "authentication", Map.of("type", "none"))));

        mockMvc.perform(post("/api/data-sources/import")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "name": "Orders API",
                      "type": "rest",
                      "config": {
                        "baseUrl": "https://api.example.test",
                        "authentication": {
                          "type": "none"
                        }
                      }
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Orders API"));

        mockMvc.perform(get("/api/data-sources/{id}/export", source.id()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Orders API"))
            .andExpect(jsonPath("$.config.baseUrl").value("https://api.example.test"));
    }

    @Test
    void delete_data_source_returns_no_content() throws Exception {
        var id = UUID.fromString("11111111-1111-1111-1111-111111111111");
        willDoNothing().given(dataSourceService).deleteDataSource(id, 3L);

        mockMvc.perform(delete("/api/data-sources/{id}", id).queryParam("version", "3"))
            .andExpect(status().isNoContent())
            .andExpect(content().string(""));
    }

    @Test
    void validation_errors_return_stable_json_body() throws Exception {
        var errors = new LinkedHashMap<String, String>();
        errors.put("config.baseUrl", "Base URL is required.");
        given(dataSourceService.createDataSource(eq("Orders API"), eq("rest"), eq(Map.of(
            "authentication", Map.of("type", "none")))))
            .willThrow(new DataSourceValidationException(errors));

        mockMvc.perform(post("/api/data-sources")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "name": "Orders API",
                      "type": "rest",
                      "config": {
                        "authentication": {
                          "type": "none"
                        }
                      }
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("validation_error"))
            .andExpect(jsonPath("$.fieldErrors['config.baseUrl']").value("Base URL is required."));
    }

    @Test
    void missing_conflicting_and_in_use_data_sources_return_specific_errors() throws Exception {
        var id = UUID.fromString("11111111-1111-1111-1111-111111111111");
        given(dataSourceService.exportDataSource(id)).willThrow(new DataSourceNotFoundException(id));
        given(dataSourceService.updateDataSource(eq(id), eq(2L), eq("Orders API"), eq("rest"), eq(Map.of(
            "baseUrl", "https://api.example.test",
            "authentication", Map.of("type", "none")))))
            .willThrow(new DataSourceVersionConflictException(id));
        org.mockito.BDDMockito.willThrow(new DataSourceInUseException(id, List.of(
            new DataSourceReference(
                UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                "Service Operations",
                UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                "Latency"))))
            .given(dataSourceService)
            .deleteDataSource(id, 2L);

        mockMvc.perform(get("/api/data-sources/{id}/export", id))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("data_source_not_found"));

        mockMvc.perform(patch("/api/data-sources/{id}", id)
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "name": "Orders API",
                      "type": "rest",
                      "config": {
                        "baseUrl": "https://api.example.test",
                        "authentication": {
                          "type": "none"
                        }
                      },
                      "version": 2
                    }
                    """))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("data_source_version_conflict"));

        mockMvc.perform(delete("/api/data-sources/{id}", id).queryParam("version", "2"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("data_source_in_use"))
            .andExpect(jsonPath("$.fieldErrors.references").value("Service Operations / Latency"));
    }

    private DataSource dataSource(
        UUID id,
        String name,
        String configJson,
        long version,
        Instant createdAt,
        Instant updatedAt
    ) {
        return new DataSource(id, name, "rest", configJson, version, createdAt, updatedAt);
    }
}
