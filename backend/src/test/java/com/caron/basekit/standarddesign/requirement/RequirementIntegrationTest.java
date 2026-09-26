package com.caron.basekit.standarddesign.requirement;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties="standard-design.requirements.storage-path=${java.io.tmpdir}/basekit-requirement-test") @AutoConfigureMockMvc @ActiveProfiles("test")
class RequirementIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    private static final String INPUT = """
        {"PROJECT_ID":"SDP-001","REQUIREMENT_NAME":"구매 흐름","REQUIREMENT_TYPE_CODE":"NEW",
         "DESCRIPTION":"구매 요구","PROCESS_DESCRIPTION":"요청 후 승인","STATUS":"DRAFT",
         "MENU_KEYS":["STANDARD_DESIGN.REQUIREMENT","STANDARD_DESIGN.WBS"],"LEGACY_SOURCE_ID":"REQ-001",
         "LEGACY_WBS_IDS":"WBS-002"}
        """;
    @Test void createsUpdatesAndMigratesIdempotentlyWithAttachment() throws Exception {
        String payload = mvc.perform(post("/api/standard-design/requirements").contentType(MediaType.APPLICATION_JSON).content(INPUT))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.DATA.MENU_KEYS.length()").value(2)).andReturn().getResponse().getContentAsString();
        JsonNode created = json.readTree(payload).path("DATA");
        String id = created.path("REQUIREMENT_ID").asText();
        mvc.perform(post("/api/standard-design/requirements").contentType(MediaType.APPLICATION_JSON).content(INPUT))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.DATA.REQUIREMENT_ID").value(id));
        String updated = INPUT.replace("구매 흐름", "구매 승인").replace("\"MENU_KEYS\":[\"STANDARD_DESIGN.REQUIREMENT\",\"STANDARD_DESIGN.WBS\"]", "\"MENU_KEYS\":[\"STANDARD_DESIGN.REQUIREMENT\"]");
        mvc.perform(put("/api/standard-design/requirements/"+id).contentType(MediaType.APPLICATION_JSON).content(updated))
                .andExpect(status().isOk()).andExpect(jsonPath("$.DATA.REQUIREMENT_NAME").value("구매 승인"))
                .andExpect(jsonPath("$.DATA.MENU_KEYS.length()").value(1))
                .andExpect(jsonPath("$.DATA.LEGACY_WBS_IDS").value("WBS-002"));
        byte[] png = new byte[]{(byte)0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,1,2,3};
        MockMultipartFile file = new MockMultipartFile("file","sample.png","image/png",png);
        String uploaded = mvc.perform(multipart("/api/standard-design/requirements/"+id+"/attachments").file(file))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String attachmentId = json.readTree(uploaded).path("DATA").path("ATTACHMENT_ID").asText();
        mvc.perform(get("/api/standard-design/requirements/"+id+"/attachments/"+attachmentId+"/file"))
                .andExpect(status().isOk()).andExpect(content().bytes(png));
        mvc.perform(delete("/api/standard-design/requirements/"+id+"/attachments/"+attachmentId)).andExpect(status().isNoContent());
        mvc.perform(delete("/api/standard-design/requirements/"+id)).andExpect(status().isNoContent());
        mvc.perform(get("/api/standard-design/requirements/"+id)).andExpect(status().isNotFound());
    }
}
