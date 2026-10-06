package com.caron.basekit.standarddesign.requirementgroup;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest(properties="spring.datasource.url=jdbc:h2:mem:requirement-group-case;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1") @AutoConfigureMockMvc @ActiveProfiles("test")
class RequirementGroupIntegrationTest {
 @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired JdbcTemplate jdbc;
 static final String BASE="/api/standard-design/requirement-groups";
 ObjectNode reqInput(String project) { var r=json.createObjectNode(); r.put("PROJECT_ID",project).put("REQUIREMENT_NAME","요구사항").put("REQUIREMENT_TYPE_CODE","NEW").put("DESCRIPTION","내용").put("PROCESS_DESCRIPTION","").put("STATUS","DRAFT"); return r; }
 JsonNode callPost(String path,JsonNode input) throws Exception { return json.readTree(mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(input))).andExpect(status().is2xxSuccessful()).andReturn().getResponse().getContentAsString()).path("DATA"); }
 JsonNode req(String project) throws Exception { return callPost("/api/standard-design/requirements",reqInput(project)); }
 ObjectNode input(String project,JsonNode req) { var r=json.createObjectNode(); r.put("PROJECT_ID",project).put("REQUIREMENT_GROUP_NAME","같은 이름").put("DESCRIPTION","").put("REQUEST_ID",UUID.randomUUID().toString()).put("VERSION",0); var m=r.putArray("MEMBERS").addObject(); m.put("REQUIREMENT_ID",req.path("REQUIREMENT_ID").asText()).put("HUMAN_YN","Y").put("INCLUSION_REASON","함께 검토").put("REVIEWED_REVISION",req.path("REQUIREMENT_REVISION").asLong()); m.putArray("SOURCE_ANALYSIS_IDS"); return r; }
 JsonNode getGroup(String id) throws Exception { return json.readTree(mvc.perform(get(BASE+"/"+id)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("DATA"); }
 ObjectNode version(JsonNode group) { return json.createObjectNode().put("VERSION",group.path("VERSION").asLong()); }
 @Test void manyGroupsPreserveMembersAndMultipleEvidenceThroughDiscardAndReconfirmation() throws Exception {
  String project="GRP-"+UUID.randomUUID().toString().substring(0,8); JsonNode req=req(project); String rid=req.path("REQUIREMENT_ID").asText();
  var recommendation=json.createObjectNode(); recommendation.put("PROJECT_ID",project).put("REQUEST_ID","one").put("ANALYSIS_BASIS","기준").put("EXECUTED_AT","2026-10-06T12:00:00Z"); var item=recommendation.putArray("ITEMS").addObject(); item.put("REQUIREMENT_ID",rid).put("ORIGINAL_REASON","원본 사유").put("REQUIREMENT_MOD_DT",req.path("MOD_DT").asText());
  String a1=callPost("/api/standard-design/requirement-recommendations",recommendation).path("ANALYSIS_ID").asText(); recommendation.put("REQUEST_ID","two"); String a2=callPost("/api/standard-design/requirement-recommendations",recommendation).path("ANALYSIS_ID").asText();
  var input=input(project,req); ((ArrayNode)input.path("MEMBERS").get(0).path("SOURCE_ANALYSIS_IDS")).add(a1).add(a2);
  JsonNode g1=callPost(BASE,input); assertEquals(g1.path("REQUIREMENT_GROUP_ID"),callPost(BASE,input).path("REQUIREMENT_GROUP_ID"));
  JsonNode g2=callPost(BASE,input(project,req)); String id1=g1.path("REQUIREMENT_GROUP_ID").asText(), id2=g2.path("REQUIREMENT_GROUP_ID").asText();
  g1=callPost(BASE+"/"+id1+"/confirm",version(g1)); g2=callPost(BASE+"/"+id2+"/confirm",version(g2));
  input.put("VERSION",g1.path("VERSION").asLong()); mvc.perform(put(BASE+"/"+id1).contentType(MediaType.APPLICATION_JSON).content(input.toString())).andExpect(status().isConflict());
  mvc.perform(delete("/api/standard-design/requirements/"+rid)).andExpect(status().isNoContent());
  JsonNode changed=json.readTree(mvc.perform(get("/api/standard-design/requirements/"+rid)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("DATA"); assertEquals("Y",changed.path("DISCARDED_YN").asText());
  g1=getGroup(id1); g2=getGroup(id2); assertEquals("REVIEW_REQUIRED",g1.path("GROUP_STATUS").asText()); assertEquals("REVIEW_REQUIRED",g2.path("GROUP_STATUS").asText()); assertEquals(1,g1.path("MEMBERS").size()); assertEquals(2,g1.path("MEMBERS").get(0).path("SOURCE_ANALYSIS_IDS").size());
  mvc.perform(post(BASE+"/"+id1+"/confirm").contentType(MediaType.APPLICATION_JSON).content(version(g1).toString())).andExpect(status().isConflict());
  input.put("VERSION",g1.path("VERSION").asLong()); ((ObjectNode)input.path("MEMBERS").get(0)).put("REVIEWED_REVISION",changed.path("REQUIREMENT_REVISION").asLong());
  g1=json.readTree(mvc.perform(put(BASE+"/"+id1).contentType(MediaType.APPLICATION_JSON).content(input.toString())).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("DATA");
  g1=callPost(BASE+"/"+id1+"/confirm",version(g1)); assertEquals("CONFIRMED",g1.path("GROUP_STATUS").asText()); assertEquals(2,g1.path("MEMBERS").get(0).path("SOURCE_ANALYSIS_IDS").size());
  assertEquals(2,jdbc.queryForObject("SELECT COUNT(*) FROM BSDRRHIS WHERE REQUIREMENT_ID=?",Integer.class,rid));
  long revision=changed.path("REQUIREMENT_REVISION").asLong(); mvc.perform(delete("/api/standard-design/requirements/"+rid)).andExpect(status().isNoContent()); assertEquals(revision,jdbc.queryForObject("SELECT REQUIREMENT_REVISION FROM BSDRREQ WHERE REQUIREMENT_ID=?",Long.class,rid));
 }
 @Test void updateReopensDraftAndConfirmedGroupsAndRejectsStaleVersionAndInvalidReferences() throws Exception {
  String project="GRP-"+UUID.randomUUID().toString().substring(0,8); JsonNode req=req(project); var input=input(project,req); JsonNode group=callPost(BASE,input); String id=group.path("REQUIREMENT_GROUP_ID").asText();
  var duplicate=input.deepCopy(); ((ArrayNode)duplicate.path("MEMBERS")).add(duplicate.path("MEMBERS").get(0).deepCopy()); mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content(duplicate.toString())).andExpect(status().isBadRequest());
  var foreign=input("OTHER",req); mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content(foreign.toString())).andExpect(status().isBadRequest());
  var invalid=input.deepCopy(); invalid.put("REQUEST_ID",UUID.randomUUID().toString()); ((ArrayNode)invalid.path("MEMBERS").get(0).path("SOURCE_ANALYSIS_IDS")).add("MISSING"); mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content(invalid.toString())).andExpect(status().isBadRequest());
  mvc.perform(put("/api/standard-design/requirements/"+req.path("REQUIREMENT_ID").asText()).contentType(MediaType.APPLICATION_JSON).content(reqInput(project).put("REQUIREMENT_NAME","변경됨").toString())).andExpect(status().isOk());
  assertEquals("REVIEW_REQUIRED",getGroup(id).path("GROUP_STATUS").asText());
  mvc.perform(post(BASE+"/"+id+"/confirm").contentType(MediaType.APPLICATION_JSON).content(version(group).toString())).andExpect(status().isConflict());
  mvc.perform(get(BASE).param("PROJECT_ID",project).param("REQUIREMENT_ID",req.path("REQUIREMENT_ID").asText())).andExpect(status().isOk()).andExpect(jsonPath("$.DATA.length()").value(1));
 }
}
