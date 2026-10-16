package com.caron.basekit.standarddesign.projectmenu;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.UUID;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class ProjectMenuIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test void managesLevelAndSingleProjectMenus() throws Exception {
        String projectId = "PM-TEST-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        mvc.perform(get("/api/standard-design/project-menus").param("PROJECT_ID", projectId))
                .andExpect(status().isOk()).andExpect(jsonPath("$.DATA.MENU_MANAGEMENT_MODE").value("LEVEL"));
        String created = mvc.perform(post("/api/standard-design/project-menus").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"PROJECT_ID\":\"" + projectId + "\",\"MENU_ID\":\"REQ\",\"MENU_NAME\":\"요구사항\",\"MENU_LEVEL\":1}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.DATA.MENU_ID").value("REQ")).andReturn().getResponse().getContentAsString();
        String id = json.readTree(created).path("DATA").path("PROJECT_MENU_ID").asText();
        String requirement = mvc.perform(post("/api/standard-design/requirements").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"PROJECT_ID\":\"" + projectId + "\",\"REQUIREMENT_NAME\":\"연결 요구사항\",\"REQUIREMENT_TYPE_CODE\":\"NEW\",\"DESCRIPTION\":\"관계 확인\",\"PROCESS_DESCRIPTION\":\"\",\"STATUS\":\"DRAFT\",\"PROJECT_MENU_IDS\":[\"" + id + "\"]}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.DATA.PROJECT_MENU_IDS.length()").value(1)).andReturn().getResponse().getContentAsString();
        String requirementId = json.readTree(requirement).path("DATA").path("REQUIREMENT_ID").asText();
        mvc.perform(delete("/api/standard-design/project-menus/" + id)).andExpect(status().isConflict());
        mvc.perform(delete("/api/standard-design/requirements/" + requirementId)).andExpect(status().isNoContent());
        mvc.perform(put("/api/standard-design/project-menus/mode").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"PROJECT_ID\":\"" + projectId + "\",\"MENU_MANAGEMENT_MODE\":\"SINGLE\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.DATA.MENU_MANAGEMENT_MODE").value("SINGLE"));
        mvc.perform(put("/api/standard-design/project-menus/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"PROJECT_ID\":\"" + projectId + "\",\"MENU_ID\":\"REQ2\",\"MENU_NAME\":\"요구사항 수정\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.DATA.MENU_ID").value("REQ2"));
        // Discarded Requirements retain project-menu references.
        mvc.perform(delete("/api/standard-design/project-menus/" + id)).andExpect(status().isConflict());
    }
}
