package com.caron.basekit.standarddesign.analysis;

import com.caron.basekit.standarddesign.llm.DesignLlmClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "standard-design.requirements.storage-path=${java.io.tmpdir}/basekit-analysis-test",
        "standard-design.llm.enabled=true", "standard-design.llm.base-url=http://localhost:1", "standard-design.llm.api-key=test",
        "standard-design.llm.model=test", "standard-design.analysis.timeout-seconds=2"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AnalysisIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean DesignLlmClient llm;
    @MockitoSpyBean ProgramFactory programFactory;

    private static final String REQ = """
        {"PROJECT_ID":"SDP-001","REQUIREMENT_NAME":"%s","REQUIREMENT_TYPE_CODE":"NEW","DESCRIPTION":"설명","PROCESS_DESCRIPTION":"처리","STATUS":"DRAFT","LEGACY_SOURCE_ID":"%s"}
        """;

    private JsonNode requirement(String name) throws Exception {
        String body = REQ.formatted(name, "AN-" + UUID.randomUUID());
        return om.readTree(mvc.perform(post("/api/standard-design/requirements").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).path("DATA");
    }

    private String llmJson(String reqId) {
        return """
            {"ANALYSIS_SUMMARY":{"TITLE":"t","SUMMARY":"s","SOURCE_REQUIREMENT_IDS":["%1$s"],"UNRESOLVED_ITEMS":[]},
             "BUSINESS_STRUCTURE":{"MENUS":[{"TEMP_ID":"M1","NAME":"메뉴"}],"ROLES":[{"TEMP_ID":"R1","NAME":"역할"}],"ACTIONS":[{"TEMP_ID":"A1","NAME":"조회"}]},
             "PROCESS_MODEL":{"STEPS":[{"TEMP_ID":"S1","NAME":"a"},{"TEMP_ID":"S2","NAME":"b"}],"TRANSITIONS":[{"FROM":"S1","TO":"S2"}]},
             "LAYOUT_RECOMMENDATION":{"LAYOUT_TYPE":"L1R2","COMPONENTS":["GRID","FORM"]},
             "SD_PROGRAM_CANDIDATES":[
               {"TEMP_ID":"C1","PROGRAM_NAME":"목록","PURPOSE":"목록 조회","SOURCE_REQUIREMENT_IDS":["%1$s"],"MENU_TEMP_IDS":["M1"],"ROLE_TEMP_IDS":["R1"],"ACTION_TEMP_IDS":["A1"],"STEP_TEMP_IDS":["S1"],"LAYOUT_TYPE":"L1R2"},
               {"TEMP_ID":"C2","PROGRAM_NAME":"상세","PURPOSE":"상세 처리","SOURCE_REQUIREMENT_IDS":["%1$s"],"LAYOUT_TYPE":"SINGLE"}]}
            """.formatted(reqId);
    }

    private JsonNode start(JsonNode req, String requestId) throws Exception {
        String body = """
            {"PROJECT_ID":"SDP-001","REQUEST_ID":"%s","OVERALL_OPINION":"의견","REQUIREMENTS":[{"REQUIREMENT_ID":"%s","MOD_DT":"%s","DESIGN_OPINION":"op"}]}
            """.formatted(requestId, req.path("REQUIREMENT_ID").asText(), req.path("MOD_DT").asText());
        return send("/api/standard-design/analyses", body);
    }

    private JsonNode fetch(String id) throws Exception {
        return om.readTree(mvc.perform(get("/api/standard-design/analyses/" + id)).andReturn().getResponse().getContentAsString()).path("DATA");
    }

    private JsonNode awaitStatus(String id, String status) throws Exception {
        await().atMost(java.time.Duration.ofSeconds(8)).until(() -> status.equals(fetch(id).path("ANALYSIS_STATUS").asText()));
        return fetch(id);
    }

    private JsonNode send(String path, String body) throws Exception {
        return om.readTree(mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body)).andReturn().getResponse().getContentAsString());
    }

    private String analyzed(JsonNode req) throws Exception {
        when(llm.chat(anyString(), anyString())).thenReturn(new DesignLlmClient.LlmChatResult("m", llmJson(req.path("REQUIREMENT_ID").asText())));
        String id = start(req, "R-" + UUID.randomUUID()).path("DATA").path("ANALYSIS_ID").asText();
        awaitStatus(id, "REVIEW_READY");
        return id;
    }

    private void confirmAll(String id, int version) throws Exception {
        String ids = om.writeValueAsString(fetch(id).path("CANDIDATES").findValuesAsText("CANDIDATE_ID"));
        send("/api/standard-design/analyses/" + id + "/confirm", "{\"RESULT_VERSION\":" + version + ",\"CANDIDATE_IDS\":" + ids + "}");
    }

    @Test void analysisYieldsUnselectedCandidatesAndIsIdempotentPerRequest() throws Exception {
        JsonNode req = requirement("A1");
        when(llm.chat(anyString(), anyString())).thenReturn(new DesignLlmClient.LlmChatResult("m", llmJson(req.path("REQUIREMENT_ID").asText())));
        String rid = "R-" + UUID.randomUUID();
        String id = start(req, rid).path("DATA").path("ANALYSIS_ID").asText();
        assertThat(start(req, rid).path("DATA").path("ANALYSIS_ID").asText()).isEqualTo(id);
        JsonNode a = awaitStatus(id, "REVIEW_READY");
        assertThat(a.path("RESULT_VERSION").asInt()).isEqualTo(1);
        assertThat(a.path("CANDIDATES")).hasSize(2);
        a.path("CANDIDATES").forEach(c -> assertThat(c.path("SELECTED_YN").asText()).isEqualTo("N"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM BSDAANLS WHERE REQUEST_ID=?", Integer.class, rid)).isEqualTo(1);
    }

    @Test void invalidStructureFailsWithoutExposingRaw() throws Exception {
        JsonNode req = requirement("A2");
        when(llm.chat(anyString(), anyString())).thenReturn(new DesignLlmClient.LlmChatResult("m", llmJson("OTHER-REQ")));
        String id = start(req, "R-" + UUID.randomUUID()).path("DATA").path("ANALYSIS_ID").asText();
        JsonNode a = awaitStatus(id, "ANALYSIS_FAILED");
        assertThat(a.path("ERROR_CODE").asText()).isEqualTo("INVALID_LLM_STRUCTURE");
        assertThat(a.toString()).doesNotContain("LAST_RAW_RESPONSE").doesNotContain("RAW_RESPONSE");
        assertThat(jdbc.queryForObject("SELECT LAST_RAW_RESPONSE FROM BSDAANLS WHERE ANALYSIS_ID=?", String.class, id)).isNotBlank();
    }

    @Test void timeoutBecomesUnknownAndLateResponseIsDiscarded() throws Exception {
        JsonNode req = requirement("A3");
        when(llm.chat(anyString(), anyString())).thenAnswer(i -> { Thread.sleep(3500); return new DesignLlmClient.LlmChatResult("m", llmJson(req.path("REQUIREMENT_ID").asText())); });
        String id = start(req, "R-" + UUID.randomUUID()).path("DATA").path("ANALYSIS_ID").asText();
        awaitStatus(id, "ANALYSIS_UNKNOWN");
        Thread.sleep(2500);
        assertThat(fetch(id).path("ANALYSIS_STATUS").asText()).isEqualTo("ANALYSIS_UNKNOWN");
        assertThat(fetch(id).path("RESULT_VERSION").asInt()).isZero();
    }

    @Test void staleBlocksEditConfirmGenerateAndReanalysisReplacesResult() throws Exception {
        JsonNode req = requirement("A4");
        String id = analyzed(req);
        confirmAll(id, 1);
        assertThat(fetch(id).path("ANALYSIS_STATUS").asText()).isEqualTo("CONFIRMED");

        String update = REQ.formatted("A4-변경", "AN-" + UUID.randomUUID());
        mvc.perform(put("/api/standard-design/requirements/" + req.path("REQUIREMENT_ID").asText()).contentType(MediaType.APPLICATION_JSON).content(update)).andExpect(status().isOk());
        JsonNode stale = fetch(id);
        assertThat(stale.path("ANALYSIS_STATUS").asText()).isEqualTo("STALE");
        assertThat(stale.path("CANDIDATES")).hasSize(2);
        stale.path("CANDIDATES").forEach(c -> assertThat(c.path("CONFIRMED_YN").asText()).isEqualTo("N"));
        assertThat(send("/api/standard-design/analyses/" + id + "/confirm", "{\"RESULT_VERSION\":1,\"CANDIDATE_IDS\":[\"x\"]}").path("ERROR_CODE").asText()).isEqualTo("ANALYSIS_STALE");
        assertThat(send("/api/standard-design/analyses/" + id + "/generate", "{\"GENERATION_REQUEST_ID\":\"g\",\"RESULT_VERSION\":1}").path("ERROR_CODE").asText()).isEqualTo("ANALYSIS_STALE");

        JsonNode fresh = om.readTree(mvc.perform(get("/api/standard-design/requirements/" + req.path("REQUIREMENT_ID").asText())).andReturn().getResponse().getContentAsString()).path("DATA");
        send("/api/standard-design/analyses/" + id + "/reanalyze", """
            {"OVERALL_OPINION":"","REQUIREMENTS":[{"REQUIREMENT_ID":"%s","MOD_DT":"%s","DESIGN_OPINION":""}]}
            """.formatted(fresh.path("REQUIREMENT_ID").asText(), fresh.path("MOD_DT").asText()));
        awaitStatus(id, "REVIEW_READY");
        JsonNode a = fetch(id);
        assertThat(a.path("RESULT_VERSION").asInt()).isEqualTo(2);
        a.path("CANDIDATES").forEach(c -> assertThat(c.path("SELECTED_YN").asText()).isEqualTo("N"));
    }

    @Test void requirementVersionConflictIsRejected() throws Exception {
        JsonNode req = requirement("A5");
        String body = """
            {"PROJECT_ID":"SDP-001","REQUEST_ID":"%s","REQUIREMENTS":[{"REQUIREMENT_ID":"%s","MOD_DT":"2000-01-01T00:00:00Z"}]}
            """.formatted("R-" + UUID.randomUUID(), req.path("REQUIREMENT_ID").asText());
        assertThat(om.readTree(mvc.perform(post("/api/standard-design/analyses").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isConflict())
                .andReturn().getResponse().getContentAsString()).path("ERROR_CODE").asText()).isEqualTo("REQUIREMENT_VERSION_CONFLICT");
    }

    @Test void editReleasesConfirmationAndVersionIsChecked() throws Exception {
        JsonNode req = requirement("A6");
        String id = analyzed(req);
        confirmAll(id, 1);
        String cid = fetch(id).path("CANDIDATES").get(0).path("CANDIDATE_ID").asText();
        ObjectNode edited = fetch(id).path("CANDIDATES").get(0).path("EFFECTIVE").deepCopy();
        edited.put("PROGRAM_NAME", "수정명");
        assertThat(om.readTree(mvc.perform(put("/api/standard-design/analyses/" + id + "/candidates/" + cid).contentType(MediaType.APPLICATION_JSON)
                .content("{\"RESULT_VERSION\":9,\"EDITED\":" + edited + "}")).andExpect(status().isConflict()).andReturn().getResponse().getContentAsString()).path("ERROR_CODE").asText()).isEqualTo("RESULT_VERSION_CONFLICT");
        mvc.perform(put("/api/standard-design/analyses/" + id + "/candidates/" + cid).contentType(MediaType.APPLICATION_JSON)
                .content("{\"RESULT_VERSION\":1,\"EDITED\":" + edited + "}")).andExpect(status().isOk());
        JsonNode a = fetch(id);
        assertThat(a.path("ANALYSIS_STATUS").asText()).isEqualTo("REVIEW_READY");
        assertThat(a.path("CANDIDATES").get(0).path("ORIGINAL").path("PROGRAM_NAME").asText()).isEqualTo("목록");
        assertThat(a.path("CANDIDATES").get(0).path("EFFECTIVE").path("PROGRAM_NAME").asText()).isEqualTo("수정명");
        a.path("CANDIDATES").forEach(c -> assertThat(c.path("CONFIRMED_YN").asText()).isEqualTo("N"));
    }

    @Test void generationCreatesOnlyProgramsAndIsIdempotent() throws Exception {
        JsonNode req = requirement("A7");
        String id = analyzed(req);
        int menus = jdbc.queryForObject("SELECT COUNT(*) FROM BSDPMENU", Integer.class);
        confirmAll(id, 1);
        String gen = "{\"GENERATION_REQUEST_ID\":\"G-" + id + "\",\"RESULT_VERSION\":1}";
        JsonNode r = send("/api/standard-design/analyses/" + id + "/generate", gen).path("DATA");
        assertThat(r.path("STATUS").asText()).isEqualTo("GENERATED");
        assertThat(r.path("ITEMS")).hasSize(2);
        send("/api/standard-design/analyses/" + id + "/generate", gen);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM BSDGPROG WHERE SOURCE_ANALYSIS_ID=?", Integer.class, id)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM BSDPMENU", Integer.class)).isEqualTo(menus);
        assertThat(fetch(id).path("ANALYSIS_STATUS").asText()).isEqualTo("GENERATED");
    }

    @Test void partialFailureRetriesOnlyFailedItems() throws Exception {
        JsonNode req = requirement("A8");
        String id = analyzed(req);
        confirmAll(id, 1);
        String failing = fetch(id).path("CANDIDATES").get(1).path("CANDIDATE_ID").asText();
        doThrow(new IllegalStateException("boom")).when(programFactory).create(failing);
        String gen = "{\"GENERATION_REQUEST_ID\":\"G-" + id + "\",\"RESULT_VERSION\":1}";
        JsonNode r = send("/api/standard-design/analyses/" + id + "/generate", gen).path("DATA");
        assertThat(r.path("STATUS").asText()).isEqualTo("PARTIAL");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM BSDGPROG WHERE SOURCE_ANALYSIS_ID=?", Integer.class, id)).isEqualTo(1);

        reset(programFactory);
        JsonNode retry = send("/api/standard-design/analyses/" + id + "/generate", gen).path("DATA");
        assertThat(retry.path("STATUS").asText()).isEqualTo("GENERATED");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM BSDGPROG WHERE SOURCE_ANALYSIS_ID=?", Integer.class, id)).isEqualTo(2);
        verify(programFactory, times(1)).create(anyString());
        verify(programFactory).create(failing);
    }
}
