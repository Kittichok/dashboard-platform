package com.dashboardplatform.widget;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class WidgetResponseTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void serializes_display_config_and_data_source_as_objects() throws Exception {
        var widget = new Widget(
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Latency",
            WidgetType.metric,
            0,
            0,
            3,
            2,
            """
                {"value":"98.4","label":"p95"}
                """,
            """
                {"type":"rest","url":"https://api.example.test/latency","method":"GET","headers":{"Accept":"application/json"},"body":null}
                """);

        String json = objectMapper.writeValueAsString(WidgetResponse.from(widget));
        Map<String, Object> response = objectMapper.readValue(json, new TypeReference<>() {
        });

        assertThat(response).containsKeys("displayConfig", "dataSource");
        assertThat(response).doesNotContainKeys("displayConfigJson", "dataSourceJson");
        assertThat(response.get("displayConfig")).isInstanceOf(Map.class);
        assertThat(response.get("dataSource")).isInstanceOf(Map.class);
    }
}
