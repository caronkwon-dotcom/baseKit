package com.caron.basekit.core.localauth;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockHttpSession;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties={"basekit.local-test-auth.enabled=true", "basekit.local-test-auth.password=integration-test-credential-only-123456789", "server.address=127.0.0.1", "server.port=8081", "spring.datasource.url=jdbc:h2:mem:local-auth-test;MODE=PostgreSQL;DATABASE_TO_UPPER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1", "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password="})
@ActiveProfiles({"local","common"})
@AutoConfigureMockMvc
class LocalTestAuthIntegrationTest {
 @Autowired MockMvc mvc;
 @Test void authenticatedGrantPersistsSettingsAndGuardsWindowAndOtherApis() throws Exception {
  mvc.perform(get("/api/core/menu-execution-settings")).andExpect(status().isUnauthorized());
  var login=mvc.perform(post("/api/core/local-test-auth").header("Origin","http://localhost:5174")
   .param("username","common-reviewer").param("password","integration-test-credential-only-123456789"))
   .andExpect(status().isFound()).andReturn();
  var session=(MockHttpSession)login.getRequest().getSession(false);
  mvc.perform(get("/api/core/menu-execution-settings").session(session)).andExpect(status().isOk());
  mvc.perform(put("/api/core/menu-execution-settings/DEV_GUIDE").session(session).header("Origin","http://localhost:5174")
   .contentType("application/json").content("{\"EXECUTION_TYPE\":\"WINDOW\",\"DESIGN_TYPE\":\"LINEAR\"}"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.DATA.DESIGN_TYPE").value("LINEAR"));
  mvc.perform(get("/api/core/window-access?MENU_ID=DEV_GUIDE&PROGRAM_KEY=DOCUMENT_CENTER").session(session))
   .andExpect(status().isOk()).andExpect(jsonPath("$.DESIGN_TYPE").value("LINEAR"));
  mvc.perform(get("/api/core/window-access?MENU_ID=DEV_GUIDE&PROGRAM_KEY=DEV_LLM_FILE_TEST").session(session)).andExpect(status().isForbidden());
  mvc.perform(get("/api/core/window-access?MENU_ID=SYS&PROGRAM_KEY=DOCUMENT_CENTER").session(session)).andExpect(status().isForbidden());
  mvc.perform(get("/api/core/users").session(session)).andExpect(status().isForbidden());
  mvc.perform(put("/api/core/menu-execution-settings/DEV_GUIDE").session(session).contentType("application/json")
   .content("{\"EXECUTION_TYPE\":\"INNER\",\"DESIGN_TYPE\":\"BASEKIT\"}")).andExpect(status().isForbidden());
  mvc.perform(put("/api/core/menu-execution-settings/DEV_GUIDE").session(session).header("Origin","http://localhost:5174").contentType("application/json")
   .content("{\"EXECUTION_TYPE\":\"INNER\",\"DESIGN_TYPE\":\"BASEKIT\"}")).andExpect(status().isOk());
  mvc.perform(get("/api/core/window-access?MENU_ID=DEV_GUIDE&PROGRAM_KEY=DOCUMENT_CENTER").session(session)).andExpect(status().isForbidden());
 }
}
