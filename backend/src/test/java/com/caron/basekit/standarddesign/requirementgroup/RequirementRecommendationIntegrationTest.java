package com.caron.basekit.standarddesign.requirementgroup;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import java.util.UUID;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class RequirementRecommendationIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    private static final String BASE = "/api/standard-design/requirement-recommendations";
    private String requirement(String project) throws Exception {
        String data = """
            {"PROJECT_ID":"%s","REQUIREMENT_NAME":"추천 근거","REQUIREMENT_TYPE_CODE":"NEW",
             "DESCRIPTION":"","PROCESS_DESCRIPTION":"","STATUS":"DRAFT"}
            """.formatted(project);
        return json.readTree(mvc.perform(post("/api/standard-design/requirements").contentType(MediaType.APPLICATION_JSON).content(data))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).path("DATA").path("REQUIREMENT_ID").asText();
    }
    private String payload(String project, String request, String id, String reason) {
        return """
            {"PROJECT_ID":"%s","REQUEST_ID":"%s","ANALYSIS_BASIS":"사용자 선택 기준",
             "EXECUTED_AT":"2026-10-06T12:00:00.123456789Z","ITEMS":[{"REQUIREMENT_ID":"%s",
             "ORIGINAL_REASON":"%s","REQUIREMENT_MOD_DT":"2026-10-06T11:00:00.123456789Z"}]}
            """.formatted(project, request, id, reason);
    }
    private String save(String payload) throws Exception {
        return json.readTree(mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("DATA").path("ANALYSIS_ID").asText();
    }
    @Test void independentRunsPreserveOriginalReasonsAndRetryIsIdempotent() throws Exception {
        String project = "REC-"+UUID.randomUUID().toString().substring(0,8);
        String id = requirement(project);
        String request = UUID.randomUUID().toString();
        String original = payload(project, request, id, "첫 실행의 원본 사유");
        String first = save(original);
        assertEquals(first, save(original));
        mvc.perform(delete("/api/standard-design/requirements/"+id)).andExpect(status().isNoContent());
        mvc.perform(get("/api/standard-design/requirements/"+id)).andExpect(status().isOk());
        String second = save(payload(project, UUID.randomUUID().toString(), id, "다른 실행의 원본 사유"));
        assertNotEquals(first, second);
        mvc.perform(get(BASE+"/"+first)).andExpect(status().isOk()).andExpect(jsonPath("$.DATA.ITEMS[0].ORIGINAL_REASON").value("첫 실행의 원본 사유"));
        mvc.perform(get(BASE).param("PROJECT_ID",project)).andExpect(status().isOk()).andExpect(jsonPath("$.DATA.length()").value(2));
        mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content(original.replace("첫 실행의 원본 사유", "덮어쓰기"))).andExpect(status().isConflict());
        mvc.perform(put(BASE+"/"+first).contentType(MediaType.APPLICATION_JSON).content(original)).andExpect(status().isMethodNotAllowed());
    }
    @Test void rejectsMissingCrossProjectAndDuplicateReferencesAtomically() throws Exception {
        String project = "REC-"+UUID.randomUUID().toString().substring(0,8);
        String id = requirement(project);
        mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content(payload("OTHER", UUID.randomUUID().toString(),id,"사유"))).andExpect(status().isBadRequest());
        mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content(payload(project, UUID.randomUUID().toString(),"MISSING","사유"))).andExpect(status().isBadRequest());
        var duplicate = json.readTree(payload(project, UUID.randomUUID().toString(),id,"사유"));
        ((com.fasterxml.jackson.databind.node.ArrayNode)duplicate.path("ITEMS")).add(duplicate.path("ITEMS").get(0).deepCopy());
        mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(duplicate))).andExpect(status().isBadRequest());
        mvc.perform(get(BASE).param("PROJECT_ID",project)).andExpect(status().isOk()).andExpect(jsonPath("$.DATA.length()").value(0));
    }
    @Test void allowsEmptyCompletedResultAndReturnsExplicitMissingAndMalformedErrors() throws Exception {
        String project = "REC-"+UUID.randomUUID().toString().substring(0,8);
        String data = """
            {"PROJECT_ID":"%s","REQUEST_ID":"empty","ANALYSIS_BASIS":"추천 없음",
             "EXECUTED_AT":"2026-10-06T12:00:00.123456789Z","ITEMS":[]}
            """.formatted(project);
        String id = save(data);
        assertEquals(id, save(data));
        mvc.perform(get(BASE+"/"+id)).andExpect(status().isOk()).andExpect(jsonPath("$.DATA.ITEMS.length()").value(0));
        mvc.perform(get(BASE+"/missing")).andExpect(status().isNotFound());
        mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isBadRequest());
    }
}
