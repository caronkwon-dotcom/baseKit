package com.caron.basekit.core.menuexecution;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import com.caron.basekit.common.api.GlobalExceptionHandler;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
class MenuExecutionIntegrationTest {
 @Test void defaultsPersistAndRejectNonRootAndInvalidEnums() throws Exception {
  var db=new EmbeddedDatabaseBuilder().generateUniqueName(true).setType(EmbeddedDatabaseType.H2).build();
  try {
   new ResourceDatabasePopulator(new ClassPathResource("db/migration/V18__menu_execution_settings.sql")).execute(db);
   var catalog=new MenuExecutionCatalog(new ObjectMapper());
   var service=new MenuExecutionService(new JdbcTemplate(db),catalog);
   var mvc=MockMvcBuilders.standaloneSetup(new MenuExecutionController(service)).setControllerAdvice(new GlobalExceptionHandler()).build();
   String root=catalog.rootIds().getFirst();
   mvc.perform(get("/api/core/menu-execution-settings"))
    .andExpect(status().isOk()).andExpect(jsonPath("$.DATA[0].EXECUTION_TYPE").value("INNER"))
    .andExpect(jsonPath("$.DATA[0].DESIGN_TYPE").value("BASEKIT"));
   mvc.perform(put("/api/core/menu-execution-settings/"+root).contentType(MediaType.APPLICATION_JSON).content("{\"EXECUTION_TYPE\":\"WINDOW\",\"DESIGN_TYPE\":\"LINEAR\"}"))
    .andExpect(status().isOk()).andExpect(jsonPath("$.DATA.MENU_ID").value(root));
   assertEquals("WINDOW", service.find(root).EXECUTION_TYPE());
   assertEquals("LINEAR", service.find(root).DESIGN_TYPE());
   mvc.perform(put("/api/core/menu-execution-settings/"+root).contentType(MediaType.APPLICATION_JSON).content("{\"EXECUTION_TYPE\":\"INNER\",\"DESIGN_TYPE\":\"BASEKIT\"}"))
    .andExpect(status().isOk());
   assertEquals("INNER", service.find(root).EXECUTION_TYPE());
   mvc.perform(put("/api/core/menu-execution-settings/SYS.USER").contentType(MediaType.APPLICATION_JSON).content("{\"EXECUTION_TYPE\":\"WINDOW\",\"DESIGN_TYPE\":\"LINEAR\"}"))
    .andExpect(status().isBadRequest());
   mvc.perform(put("/api/core/menu-execution-settings/"+root).contentType(MediaType.APPLICATION_JSON).content("{\"EXECUTION_TYPE\":\"SHELL\",\"DESIGN_TYPE\":\"LINEAR\"}"))
    .andExpect(status().isBadRequest());
   mvc.perform(put("/api/core/menu-execution-settings/"+root).contentType(MediaType.APPLICATION_JSON).content("{\"DESIGN_TYPE\":\"LINEAR\"}"))
    .andExpect(status().isBadRequest());
   assertFalse(catalog.containsProgram("SYS", "SD_PROJECT_MGMT"));
   assertTrue(catalog.containsProgram("SYS", "USER_MGMT"));
   assertNotNull(catalog.rootForProgram("SD_PROJECT_MGMT"));
   assertNull(catalog.rootForProgram("FORGED_PROGRAM"));
  } finally { db.shutdown(); }
 }
}
