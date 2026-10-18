package com.caron.basekit.standarddesign.requirementgroup;

import com.caron.basekit.standarddesign.llm.DesignLlmClient;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties="spring.datasource.url=jdbc:h2:mem:project-grouping;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc @ActiveProfiles("test")
class ProjectGroupingIntegrationTest {
    @Autowired ProjectGroupingService service;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired MockMvc mvc;
    @MockitoBean DesignLlmClient llm;
    String project() {return "PGTEST-"+UUID.randomUUID().toString().substring(0,8);}
    JsonNode requirement(String project,String name) throws Exception {
        var input=json.createObjectNode().put("PROJECT_ID",project).put("REQUIREMENT_NAME",name).put("REQUIREMENT_TYPE_CODE","NEW").put("DESCRIPTION","구매 주문 원문").put("PROCESS_DESCRIPTION","주문 → 승인").put("STATUS","DRAFT");
        return json.readTree(mvc.perform(post("/api/standard-design/requirements").contentType(MediaType.APPLICATION_JSON).content(input.toString())).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).path("DATA");
    }
    Map<String,Object> waitFor(String project,String id) throws Exception {
        for(int i=0;i<300;i++){var result=service.get(project,id);if(!"RUNNING".equals(result.get("STATUS")))return result;Thread.sleep(10);}throw new AssertionError("Grouping did not complete");
    }
    void reply(String raw) { doReturn(new DesignLlmClient.LlmChatResult("test",raw)).when(llm).chatRaw(anyString(),anyString(),any()); }
    String raw(String rid) {return "{\"GROUPS\":[{\"TITLE\":\"구매\",\"REASON\":\"주문 업무\",\"MEMBERS\":[{\"REQUIREMENT_ID\":\""+rid+"\",\"REASON\":\"주문 원문\"},{\"REQUIREMENT_ID\":\"HALLUCINATED\",\"REASON\":\"invalid\"}]}],\"UNCLASSIFIED\":[]}";}
    @Test void completeCoverageImmutableRawDraftPersistenceAndIdempotentRegistration() throws Exception {
        String project=project();var a=requirement(project,"주문");var b=requirement(project,"배송");var removed=requirement(project,"폐기");
        mvc.perform(delete("/api/standard-design/requirements/"+removed.path("REQUIREMENT_ID").asText())).andExpect(status().isNoContent());
        String raw=raw(a.path("REQUIREMENT_ID").asText());reply(raw);
        var run=service.start(project,"same-request");String id=run.get("ANALYSIS_ID").toString();run=waitFor(project,id);
        assertEquals("SUCCESS",run.get("STATUS"));assertEquals(2,((JsonNode)run.get("INPUT")).size());
        assertEquals(id,service.start(project,"same-request").get("ANALYSIS_ID"));
        ObjectNode draft=((JsonNode)run.get("DRAFT")).deepCopy();assertEquals(1,draft.path("GROUPS").size());assertEquals(1,draft.path("GROUPS").get(0).path("MEMBERS").size());
        assertEquals(b.path("REQUIREMENT_ID").asText(),draft.path("UNCLASSIFIED").get(0).path("REQUIREMENT_ID").asText());
        ((ObjectNode)draft.path("GROUPS").get(0)).put("TITLE","사람이 편집한 구매").put("REVIEW_STATUS","APPROVED");
        run=service.save(project,id,1L,draft);assertEquals(draft,service.get(project,id).get("DRAFT"));
        String gid=draft.path("GROUPS").get(0).path("GROUP_ID").asText();
        var pool=java.util.concurrent.Executors.newFixedThreadPool(2);
        try { var first=pool.submit(()->service.register(project,id,2L,List.of(gid)));var second=pool.submit(()->service.register(project,id,2L,List.of(gid)));first.get();second.get(); } finally {pool.shutdownNow();}
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM BSDRGRP WHERE PROJECT_ID=?",Integer.class,project));
        assertEquals("DRAFT",jdbc.queryForObject("SELECT GROUP_STATUS FROM BSDRGRP WHERE PROJECT_ID=?",String.class,project));
        assertEquals(raw,jdbc.queryForObject("SELECT RESPONSE_RAW_JSON FROM BSDPGRAW WHERE ANALYSIS_ID=?",String.class,id));
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM BSDPGLNK WHERE ANALYSIS_ID=?",Integer.class,id));
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->service.save(project,id,1L,draft));
        ((ObjectNode)draft.path("GROUPS").get(0)).put("TITLE","registered cannot change");
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->service.save(project,id,2L,draft));
        mvc.perform(get("/api/standard-design/projects/foreign/grouping/"+id)).andExpect(status().isNotFound());
        mvc.perform(get("/api/standard-design/requirement-groups").param("PROJECT_ID",project)).andExpect(status().isOk());
    }
    @Test void invalidMembershipUnapprovedAndStaleRequirementsCannotRegister() throws Exception {
        String project=project();var req=requirement(project,"구매");reply(raw(req.path("REQUIREMENT_ID").asText()));
        var run=service.start(project,"first");String id=run.get("ANALYSIS_ID").toString();run=waitFor(project,id);
        ObjectNode draft=((JsonNode)run.get("DRAFT")).deepCopy();String gid=draft.path("GROUPS").get(0).path("GROUP_ID").asText();
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->service.register(project,id,1L,List.of(gid)));
        var invalid=draft.deepCopy();((ObjectNode)invalid.path("GROUPS").get(0).path("MEMBERS").get(0)).put("REQUIREMENT_ID","foreign");
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->service.save(project,id,1L,invalid));
        ((ObjectNode)draft.path("GROUPS").get(0)).put("REVIEW_STATUS","APPROVED");service.save(project,id,1L,draft);
        mvc.perform(delete("/api/standard-design/requirements/"+req.path("REQUIREMENT_ID").asText())).andExpect(status().isNoContent());
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->service.register(project,id,2L,List.of(gid)));
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM BSDRGRP WHERE PROJECT_ID=?",Integer.class,project));
    }
    @Test void chunkAggregationCoversAllInputWithoutChangingOriginals() throws Exception {
        String project=project();for(int i=0;i<25;i++)requirement(project,"요구사항 "+i);
        doAnswer(call->{JsonNode batch=json.readTree((String)call.getArgument(1));var response=json.createObjectNode();var g=response.putArray("GROUPS").addObject().put("TITLE","구매").put("REASON","통합");var members=g.putArray("MEMBERS");for(JsonNode r:batch)members.addObject().put("REQUIREMENT_ID",r.path("REQUIREMENT_ID").asText()).put("REASON","같은 업무");return new DesignLlmClient.LlmChatResult("test",response.toString());}).when(llm).chatRaw(anyString(),anyString(),any());
        var start=service.start(project,"chunks");var run=waitFor(project,start.get("ANALYSIS_ID").toString());
        assertEquals("SUCCESS",run.get("STATUS"));var draft=(JsonNode)run.get("DRAFT");assertEquals(1,draft.path("GROUPS").size());assertEquals(25,draft.path("GROUPS").get(0).path("MEMBERS").size());assertEquals(0,draft.path("UNCLASSIFIED").size());
        assertEquals(2,jdbc.queryForObject("SELECT COUNT(*) FROM BSDPGRAW WHERE ANALYSIS_ID=?",Integer.class,start.get("ANALYSIS_ID")));
        assertEquals(25,jdbc.queryForObject("SELECT COUNT(*) FROM BSDRREQ WHERE PROJECT_ID=?",Integer.class,project));
    }
    @Test void malformedLlmKeepsRawAndTimeoutAllowsRetry() throws Exception {
        String project=project();requirement(project,"테스트");reply("not-json");var first=service.start(project,"failure");String id=first.get("ANALYSIS_ID").toString();assertEquals("FAILED",waitFor(project,id).get("STATUS"));
        assertEquals("not-json",jdbc.queryForObject("SELECT RESPONSE_RAW_JSON FROM BSDPGRAW WHERE ANALYSIS_ID=?",String.class,id));
        jdbc.update("UPDATE BSDPGANL SET STATUS='RUNNING',DEADLINE_AT=? WHERE ANALYSIS_ID=?",java.time.OffsetDateTime.now().minusMinutes(1),id);
        assertEquals("FAILED_TIMEOUT",service.get(project,id).get("STATUS"));
        assertNotEquals(id,service.start(project,"retry").get("ANALYSIS_ID"));
    }
}
