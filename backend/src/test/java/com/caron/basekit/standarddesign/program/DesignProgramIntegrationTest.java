package com.caron.basekit.standarddesign.program;
import com.fasterxml.jackson.databind.*;
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

@SpringBootTest(properties="spring.datasource.url=jdbc:h2:mem:program-register;MODE=PostgreSQL;DATABASE_TO_UPPER=TRUE;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc @ActiveProfiles("test")
class DesignProgramIntegrationTest {
 @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired JdbcTemplate jdbc;
 record Fixture(String project,String group,String analysis,String req) {String base(){return "/api/standard-design/projects/"+project+"/programs";}}
 JsonNode postJson(String path,JsonNode input) throws Exception {return json.readTree(mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(input.toString())).andExpect(status().is2xxSuccessful()).andReturn().getResponse().getContentAsString()).path("DATA");}
 Fixture fixture() throws Exception {
  String project="PR-"+UUID.randomUUID().toString().substring(0,8);
  var req=postJson("/api/standard-design/requirements",json.createObjectNode().put("PROJECT_ID",project).put("REQUIREMENT_NAME","구매 요구사항").put("REQUIREMENT_TYPE_CODE","NEW").put("DESCRIPTION","분석 당시 본문").put("PROCESS_DESCRIPTION","등록 → 승인").put("STATUS","DRAFT"));
  String rid=req.path("REQUIREMENT_ID").asText();
  var input=json.createObjectNode().put("PROJECT_ID",project).put("REQUIREMENT_GROUP_NAME","구매 그룹").put("DESCRIPTION","").put("REQUEST_ID",UUID.randomUUID().toString());
  input.putArray("MEMBERS").addObject().put("REQUIREMENT_ID",rid).put("HUMAN_YN","Y").put("INCLUSION_REASON","").put("REVIEWED_REVISION",1).putArray("SOURCE_ANALYSIS_IDS");
  var group=postJson("/api/standard-design/requirement-groups",input);String gid=group.path("REQUIREMENT_GROUP_ID").asText();
  group=postJson("/api/standard-design/requirement-groups/"+gid+"/confirm",json.createObjectNode().put("VERSION",group.path("VERSION").asLong()));
  var savedInput=json.createObjectNode();savedInput.putObject("project").put("projectId",project);savedInput.putObject("group").put("groupId",gid);
  savedInput.putArray("requirements").addObject().put("requirementId",rid).put("revision",1).put("name","구매 요구사항").put("description","분석 당시 본문");
  String snapshot=savedInput.toString();
  jdbc.update("INSERT INTO BSD"+"RGCTX(REQUIREMENT_GROUP_ID,GROUP_VERSION,REQUEST_JSON) VALUES(?,?,?)",gid,group.path("VERSION").asLong(),snapshot);
  String aid="GA-"+UUID.randomUUID();
  var response=json.createObjectNode();response.putObject("summary").put("text","구매 업무 개요입니다.");response.putArray("businessAreas");response.putArray("processCandidates");response.putArray("observations");
  response.putArray("programCandidates").addObject().put("name","구매 등록").put("purpose","구매 요청을 등록합니다.").putArray("evidenceRequirementIds").add(rid);
  jdbc.update("INSERT INTO BSDRGANL(ANALYSIS_ID,REQUIREMENT_GROUP_ID,GROUP_VERSION,REQUEST_ID,REQUEST_JSON,RESPONSE_RAW_JSON,MODEL_NAME,PROMPT_VERSION,STATUS,ANALYSIS_TYPE) VALUES(?,?,?,?,?,?,?,?,?,?)",aid,gid,group.path("VERSION").asLong(),aid,snapshot,response.toString(),"fixture","group-overview-v0","SUCCESS","GROUP_DESIGN");
  return new Fixture(project,gid,aid,rid);
 }
 JsonNode adoption(Fixture f,int...indexes){var input=json.createObjectNode().put("GROUP_ID",f.group()).put("ANALYSIS_ID",f.analysis());var array=input.putArray("CANDIDATE_INDEXES");for(int index:indexes)array.add(index);return input;}
 @Test void adoptsEditsPersistsAndPreservesAnalysisAndRevision() throws Exception {
  var f=fixture();var before=jdbc.queryForMap("SELECT * FROM BSDRGANL WHERE ANALYSIS_ID=?",f.analysis());
  mvc.perform(get(f.base()+"/candidates").param("GROUP_ID",f.group()).param("ANALYSIS_ID",f.analysis())).andExpect(status().isOk()).andExpect(jsonPath("$.DATA[0].EVIDENCE[0].revision").value(1));
  var program=postJson(f.base()+"/adoptions",adoption(f,0)).get(0);String id=program.path("PROGRAM_ID").asText();assertTrue(id.startsWith("SDPG-"));
  assertEquals(f.group(),program.path("SOURCE_GROUP_ID").asText());assertEquals(f.analysis(),program.path("SOURCE_ANALYSIS_ID").asText());assertEquals(1,program.path("EVIDENCE").get(0).path("REQUIREMENT_REVISION").asInt());
  mvc.perform(put(f.base()+"/"+id).contentType(MediaType.APPLICATION_JSON).content(json.createObjectNode().put("PROGRAM_NAME","수정된 프로그램").put("DESCRIPTION","수정 설명").put("VERSION",1).toString())).andExpect(status().isOk()).andExpect(jsonPath("$.DATA.PROGRAM_ID").value(id));
  mvc.perform(get(f.base())).andExpect(status().isOk()).andExpect(jsonPath("$.DATA[0].PROGRAM_NAME").value("수정된 프로그램")).andExpect(jsonPath("$.DATA[0].DESCRIPTION").value("수정 설명"));
  mvc.perform(post(f.base()+"/adoptions").contentType(MediaType.APPLICATION_JSON).content(adoption(f,0).toString())).andExpect(status().isConflict());
  mvc.perform(get(f.base()+"/candidates").param("GROUP_ID",f.group()).param("ANALYSIS_ID",f.analysis())).andExpect(jsonPath("$.DATA[0].PROGRAM_ID").value(id));
  assertEquals(before,jdbc.queryForMap("SELECT * FROM BSDRGANL WHERE ANALYSIS_ID=?",f.analysis()));
 }
 @Test void manualProgramsHaveStableDistinctIdsAndProjectScopedOptimisticUpdates() throws Exception {
  String base="/api/standard-design/projects/MANUAL/programs";
  var input=json.createObjectNode().put("PROGRAM_NAME","직접 추가").put("DESCRIPTION","");
  var a=postJson(base,input);var b=postJson(base,input);assertNotEquals(a.path("PROGRAM_ID"),b.path("PROGRAM_ID"));assertTrue(a.path("SOURCE_ANALYSIS_ID").isNull());
  String id=a.path("PROGRAM_ID").asText();input.put("VERSION",1);
  mvc.perform(put(base+"/"+id).contentType(MediaType.APPLICATION_JSON).content(input.toString())).andExpect(status().isOk());
  mvc.perform(put(base+"/"+id).contentType(MediaType.APPLICATION_JSON).content(input.toString())).andExpect(status().isConflict());
  mvc.perform(put("/api/standard-design/projects/OTHER/programs/"+id).contentType(MediaType.APPLICATION_JSON).content(input.toString())).andExpect(status().isNotFound());
  mvc.perform(get("/api/standard-design/projects/OTHER/programs")).andExpect(jsonPath("$.DATA.length()").value(0));
 }
 @Test void rejectsMismatchedProjectBadIndexesAndRollsBackWholeSelection() throws Exception {
  var f=fixture();mvc.perform(get("/api/standard-design/projects/OTHER/programs/candidates").param("GROUP_ID",f.group()).param("ANALYSIS_ID",f.analysis())).andExpect(status().isUnprocessableEntity());
  mvc.perform(post(f.base()+"/adoptions").contentType(MediaType.APPLICATION_JSON).content(adoption(f,0,99).toString())).andExpect(status().isUnprocessableEntity());
  assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM BSDGPROG WHERE PROJECT_ID=?",Integer.class,f.project()));
  mvc.perform(post(f.base()).contentType(MediaType.APPLICATION_JSON).content("{\"PROGRAM_NAME\":\" \",\"DESCRIPTION\":\"\"}")).andExpect(status().isUnprocessableEntity());
 }
 @Test void unknownEvidenceAndNonDesignRunsCannotBeAdopted() throws Exception {
  var f=fixture();String raw=jdbc.queryForObject("SELECT RESPONSE_RAW_JSON FROM BSDRGANL WHERE ANALYSIS_ID=?",String.class,f.analysis());
  jdbc.update("UPDATE BSDRGANL SET RESPONSE_RAW_JSON=? WHERE ANALYSIS_ID=?",raw.replace(f.req(),"UNKNOWN"),f.analysis());
  mvc.perform(get(f.base()+"/candidates").param("GROUP_ID",f.group()).param("ANALYSIS_ID",f.analysis())).andExpect(status().isOk()).andExpect(jsonPath("$.DATA[0].ERROR").isNotEmpty());
  mvc.perform(post(f.base()+"/adoptions").contentType(MediaType.APPLICATION_JSON).content(adoption(f,0).toString())).andExpect(status().isUnprocessableEntity());
  jdbc.update("UPDATE BSDRGANL SET ANALYSIS_TYPE='GROUP_RECOMMENDATION' WHERE ANALYSIS_ID=?",f.analysis());
  mvc.perform(post(f.base()+"/adoptions").contentType(MediaType.APPLICATION_JSON).content(adoption(f,0).toString())).andExpect(status().isUnprocessableEntity());
 }
}
