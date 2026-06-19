package com.dashboardplatform.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "spring.datasource.url=jdbc:sqlite:${java.io.tmpdir}/spa-forward-controller-test.db")
@AutoConfigureMockMvc
class SpaForwardControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Should forward to index HTML when browser requests root path")
    void rootPath_shouldForwardToIndexHtml_whenBrowserRequestsApplicationRoot() throws Exception {

        // Given - application context is running with static frontend assets on the classpath

        // When - browser requests the SPA root URL
        mockMvc.perform(get("/"))

            // Then - Spring forwards root traffic to the built SPA document
            .andExpect(status().isOk())
            .andExpect(forwardedUrl("/index.html"));
    }

    @Test
    @DisplayName("Should serve index HTML when browser requests index document directly")
    void indexHtml_shouldServeIndexHtml_whenBrowserRequestsIndexDocument() throws Exception {

        // Given - application context is running with static frontend assets on the classpath

        // When - browser requests the built index document directly
        mockMvc.perform(get("/index.html"))

            // Then - request bypasses SPA forward controller and static resource handler serves file
            .andExpect(status().isOk())
            .andExpect(content().string(org.hamcrest.Matchers.containsString("<html")));
    }
}