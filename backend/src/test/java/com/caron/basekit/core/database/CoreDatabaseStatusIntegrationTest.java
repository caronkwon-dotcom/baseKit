package com.caron.basekit.core.database;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CoreDatabaseStatusIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsFlywayMarkerThroughRestServiceAndMyBatis() throws Exception {
        mockMvc.perform(get("/api/core/database/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.SUCCESS").value(true))
                .andExpect(jsonPath("$.DATA.STATUS").value("UP"))
                .andExpect(jsonPath("$.DATA.DATABASE_PRODUCT").value("H2"))
                .andExpect(jsonPath("$.DATA.MIGRATION_READY").value(true))
                .andExpect(jsonPath("$.DATA.MIGRATION_MARKER.MARKER_CODE")
                        .value("BACKEND_FOUNDATION_V1"));
    }
}
