package com.caron.basekit.core.windowaccess;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties="basekit.window.allow-unauthenticated-development=true")
@AutoConfigureMockMvc
@ActiveProfiles({"test","dev","production"})
class ProductionMissingHostTest {
    @Autowired MockMvc mvc;
    @Test void sensitiveApisDenyMissingHostEvenWithDevOptInAndPrincipal() throws Exception {
        mvc.perform(get("/api/core/programs").principal(()->"user")).andExpect(status().isForbidden());
        mvc.perform(get("/api/core/window-access").param("MENU_ID","system").param("PROGRAM_KEY","MENU_MGMT"))
                .andExpect(status().isForbidden());
    }
}
