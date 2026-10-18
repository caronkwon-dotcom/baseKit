package com.caron.basekit.core.menuexecution;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties={"server.address=127.0.0.1", "server.port=8081", "spring.datasource.url=jdbc:h2:mem:local-auth-test;MODE=PostgreSQL;DATABASE_TO_UPPER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1", "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password="})
@ActiveProfiles("common")
@AutoConfigureMockMvc
class MenuExecutionDevelopmentIntegrationTest {
 @Autowired MockMvc mvc;
 @Test void developmentWithoutLoginPersistsSettingsAndValidatesWindow() throws Exception {
  mvc.perform(get("/api/core/menu-execution-settings")).andExpect(status().isOk());
  mvc.perform(put("/api/core/menu-execution-settings/DEV_GUIDE").header("Origin","http://localhost:5174")
   .contentType("application/json").content("{\"EXECUTION_TYPE\":\"WINDOW\",\"DESIGN_TYPE\":\"LINEAR\"}"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.DATA.DESIGN_TYPE").value("LINEAR"));
  mvc.perform(get("/api/core/window-access?MENU_ID=DEV_GUIDE&PROGRAM_KEY=DOCUMENT_CENTER"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.DESIGN_TYPE").value("LINEAR"));
  mvc.perform(get("/api/core/window-access?MENU_ID=DEV_GUIDE&PROGRAM_KEY=DEV_LLM_FILE_TEST")).andExpect(status().isOk());
  mvc.perform(get("/api/core/window-access?MENU_ID=SYS&PROGRAM_KEY=DOCUMENT_CENTER")).andExpect(status().isForbidden());
  mvc.perform(put("/api/core/menu-execution-settings/DEV_GUIDE").header("Origin","http://localhost:5174").contentType("application/json")
   .content("{\"EXECUTION_TYPE\":\"INNER\",\"DESIGN_TYPE\":\"BASEKIT\"}")).andExpect(status().isOk());
  mvc.perform(get("/api/core/window-access?MENU_ID=DEV_GUIDE&PROGRAM_KEY=DOCUMENT_CENTER")).andExpect(status().isForbidden());
 }
}
