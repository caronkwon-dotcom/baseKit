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
 @Test void productionCannotReadOrSaveWithoutTrustedHost() throws Exception {
  var service=org.mockito.Mockito.mock(MenuExecutionService.class);
  var environment=new org.springframework.mock.env.MockEnvironment();
  environment.setActiveProfiles("production", "dev");
  var beans=new org.springframework.beans.factory.support.StaticListableBeanFactory();
  var providers=beans.getBeanProvider(com.caron.basekit.core.endpoint.EndpointPermissionProvider.class);
  var mvc=MockMvcBuilders.standaloneSetup(new MenuExecutionController(service,providers,new com.caron.basekit.core.windowaccess.WindowAccessPolicy(environment)))
   .setControllerAdvice(new GlobalExceptionHandler()).build();
  mvc.perform(get("/api/core/menu-execution-settings")).andExpect(status().isForbidden());
  mvc.perform(put("/api/core/menu-execution-settings/SYS").principal(() -> "user").contentType(MediaType.APPLICATION_JSON).content("{\"EXECUTION_TYPE\":\"WINDOW\",\"DESIGN_TYPE\":\"LINEAR\"}"))
   .andExpect(status().isForbidden());
  org.mockito.Mockito.verifyNoInteractions(service);
 }
 @Test void hostDenialCannotBeOverriddenByDevelopmentProfile() throws Exception {
  var service=org.mockito.Mockito.mock(MenuExecutionService.class);
  var environment=new org.springframework.mock.env.MockEnvironment(); environment.setActiveProfiles("dev");
  var provider=org.mockito.Mockito.mock(com.caron.basekit.core.endpoint.EndpointPermissionProvider.class);
  var beans=new org.springframework.beans.factory.support.StaticListableBeanFactory(); beans.addBean("host",provider);
  var mvc=MockMvcBuilders.standaloneSetup(new MenuExecutionController(service,beans.getBeanProvider(com.caron.basekit.core.endpoint.EndpointPermissionProvider.class),new com.caron.basekit.core.windowaccess.WindowAccessPolicy(environment)))
   .setControllerAdvice(new GlobalExceptionHandler()).build();
  mvc.perform(put("/api/core/menu-execution-settings/SYS").principal(() -> "user").contentType(MediaType.APPLICATION_JSON).content("{\"EXECUTION_TYPE\":\"WINDOW\",\"DESIGN_TYPE\":\"LINEAR\"}"))
   .andExpect(status().isForbidden());
  org.mockito.Mockito.verifyNoInteractions(service);
 }
 @Test void defaultsPersistAndRejectNonRootAndInvalidEnums() throws Exception {
  var db=new EmbeddedDatabaseBuilder().generateUniqueName(true).setType(EmbeddedDatabaseType.H2).build();
  try {
   new ResourceDatabasePopulator(new ClassPathResource("db/migration/V18__menu_execution_settings.sql")).execute(db);
   var catalog=new MenuExecutionCatalog(new ObjectMapper());
   var service=new MenuExecutionService(new JdbcTemplate(db),catalog);
   var environment=new org.springframework.mock.env.MockEnvironment();
   environment.setActiveProfiles("common");
   var beans=new org.springframework.beans.factory.support.StaticListableBeanFactory();
   // COMMON runs without a Host provider or principal during first-phase development.
   var providers=beans.getBeanProvider(com.caron.basekit.core.endpoint.EndpointPermissionProvider.class);
   var mvc=MockMvcBuilders.standaloneSetup(new MenuExecutionController(service, providers, new com.caron.basekit.core.windowaccess.WindowAccessPolicy(environment))).setControllerAdvice(new GlobalExceptionHandler()).build();
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
