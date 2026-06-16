package com.dashboardplatform.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SpaForwardControllerTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new SpaForwardController()).build();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/dashboards", "/dashboards/11111111-1111-1111-1111-111111111111", "/library/search"})
    void browserRoutesWithoutFileExtensionsForwardToIndexHtml(String path) throws Exception {
        mockMvc.perform(get(path))
            .andExpect(status().isOk())
            .andExpect(forwardedUrl("/index.html"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/dashboards", "/api/dashboards/11111111-1111-1111-1111-111111111111"})
    void apiRoutesAreNotForwarded(String path) throws Exception {
        mockMvc.perform(get(path))
            .andExpect(status().isNotFound())
            .andExpect(forwardedUrl(null));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/favicon.ico", "/assets/app.js", "/styles/site.css", "/images/logo.svg"})
    void fileExtensionRequestsAreNotForwarded(String path) throws Exception {
        mockMvc.perform(get(path))
            .andExpect(status().isNotFound())
            .andExpect(forwardedUrl(null));
    }
}
