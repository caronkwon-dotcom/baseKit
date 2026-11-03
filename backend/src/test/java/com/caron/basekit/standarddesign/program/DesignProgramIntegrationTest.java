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
 @Test void adoptsCandidatesFromGroupProgramsAnalysis() throws Exception {
  var f=fixture();
  var validated=json.createObjectNode();
  validated.putArray("programCandidates").addObject().put("name","구매 등록").put("type","BATCH").put("purpose","구매 요청을 등록합니다.").putArray("evidenceRequirementIds").add(f.req());
  validated.putArray("unclassified");
  jdbc.update("UPDATE BSDRGANL SET ANALYSIS_TYPE='GROUP_PROGRAMS',RESPONSE_VALIDATED_JSON=? WHERE ANALYSIS_ID=?",validated.toString(),f.analysis());
  mvc.perform(get(f.base()+"/candidates").param("GROUP_ID",f.group()).param("ANALYSIS_ID",f.analysis())).andExpect(status().isOk()).andExpect(jsonPath("$.DATA[0].PROGRAM_NAME").value("구매 등록")).andExpect(jsonPath("$.DATA[0].EVIDENCE[0].requirementId").value(f.req())).andExpect(jsonPath("$.DATA[0].PROGRAM_KIND").value("BATCH"));
  var program=postJson(f.base()+"/adoptions",adoption(f,0)).get(0);
  assertEquals(f.group(),program.path("SOURCE_GROUP_ID").asText());assertEquals(1,program.path("EVIDENCE").size());
  assertEquals("BATCH",program.path("PROGRAM_KIND").asText());
  mvc.perform(get(f.base())).andExpect(status().isOk()).andExpect(jsonPath("$.DATA[0].PROGRAM_KIND").value("BATCH"));
 }
 /** Stores a validated program list on the fixture's analysis; compare=null mimics an analysis that never compared the register. */
 void validated(Fixture f,String compare,JsonNode... candidates) {
  var response=json.createObjectNode();var array=response.putArray("programCandidates");for(var candidate:candidates)array.add(candidate);response.putArray("unclassified");
  if(compare!=null)response.putObject("ledgerCompare").put("performed",true).put("total",1).put("included",compare.equals("PARTIAL")?0:1).put("omitted",compare.equals("PARTIAL")?1:0).put("detail","FULL").put("partial",compare.equals("PARTIAL"));
  jdbc.update("UPDATE BSDRGANL SET ANALYSIS_TYPE='GROUP_PROGRAMS',PROMPT_VERSION=?,RESPONSE_VALIDATED_JSON=? WHERE ANALYSIS_ID=?",compare==null?"group-programs-v0.2":"group-programs-v0.3",response.toString(),f.analysis());
 }
 JsonNode candidate(Fixture f,String name,String decision,String status,String issue) {
  var item=json.createObjectNode().put("name",name).put("type","SCREEN").put("purpose","설명").put("decision",decision).put("reason","근거").put("reviewStatus",status);
  item.putNull("existingProgramId");item.putNull("changeSummary");item.putArray("evidenceRequirementIds").add(f.req());item.putArray("warnings");
  var issues=item.putArray("issues");if(issue!=null)issues.add(issue);
  if(!decision.equals("NEW")&&issue==null)item.putObject("existing").put("programId","SDPG-x").put("name","기존").putNull("kind");
  return item;
 }
 int programCount(Fixture f) {return jdbc.queryForObject("SELECT COUNT(*) FROM BSDGPROG WHERE PROJECT_ID=?",Integer.class,f.project());}
 @Test void reviewRequiredReuseAndChangeCandidatesCannotBeRegistered() throws Exception {
  var f=fixture();
  validated(f,"DONE",candidate(f,"신규 프로그램","NEW","OK",null),candidate(f,"검토 필요","REUSE","REVIEW_REQUIRED","EXISTING_ID_UNKNOWN"),candidate(f,"재사용","REUSE","OK",null),candidate(f,"변경","CHANGE","OK",null));
  var rows=json.readTree(mvc.perform(get(f.base()+"/candidates").param("GROUP_ID",f.group()).param("ANALYSIS_ID",f.analysis())).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("DATA");
  assertTrue(rows.get(0).path("REGISTRABLE").asBoolean());assertEquals("DONE",rows.get(0).path("LEDGER_COMPARE").asText());
  for(int i=1;i<=3;i++){assertFalse(rows.get(i).path("REGISTRABLE").asBoolean(),"candidate "+i);assertTrue(rows.get(i).path("BLOCK_REASONS").size()>0);}
  assertEquals("EXISTING_ID_UNKNOWN",rows.get(1).path("ISSUES").get(0).path("CODE").asText());
  assertTrue(rows.get(1).path("ISSUES").get(0).path("MESSAGE").asText().contains("존재하지 않습니다"));
  for(int i=1;i<=3;i++) mvc.perform(post(f.base()+"/adoptions").contentType(MediaType.APPLICATION_JSON).content(adoption(f,i).toString())).andExpect(status().isUnprocessableEntity());
  mvc.perform(post(f.base()+"/adoptions").contentType(MediaType.APPLICATION_JSON).content(adoption(f,0,1).toString())).andExpect(status().isUnprocessableEntity());
  assertEquals(0,programCount(f));
  assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM BSDGPREQ WHERE PROGRAM_ID IN (SELECT PROGRAM_ID FROM BSDGPROG WHERE PROJECT_ID=?)",Integer.class,f.project()));
  postJson(f.base()+"/adoptions",adoption(f,0));
  assertEquals(1,programCount(f));
 }
 @Test void partialRegisterAnalysisBlocksNewRegistration() throws Exception {
  var f=fixture();
  validated(f,"PARTIAL",candidate(f,"신규 프로그램","NEW","OK",null));
  mvc.perform(get(f.base()+"/candidates").param("GROUP_ID",f.group()).param("ANALYSIS_ID",f.analysis())).andExpect(status().isOk())
   .andExpect(jsonPath("$.DATA[0].LEDGER_COMPARE").value("PARTIAL")).andExpect(jsonPath("$.DATA[0].REGISTRABLE").value(false));
  mvc.perform(post(f.base()+"/adoptions").contentType(MediaType.APPLICATION_JSON).content(adoption(f,0).toString())).andExpect(status().isUnprocessableEntity());
  assertEquals(0,programCount(f));
 }
 @Test void resultsWithoutRegisterComparisonStayReadableAndRegistrableWithoutChangingTheAnalysis() throws Exception {
  var f=fixture();
  var older=json.createObjectNode().put("name","이전 분석 프로그램").put("purpose","설명");older.putArray("evidenceRequirementIds").add(f.req());
  validated(f,null,older);
  var before=jdbc.queryForMap("SELECT * FROM BSDRGANL WHERE ANALYSIS_ID=?",f.analysis());
  mvc.perform(get(f.base()+"/candidates").param("GROUP_ID",f.group()).param("ANALYSIS_ID",f.analysis())).andExpect(status().isOk())
   .andExpect(jsonPath("$.DATA[0].LEDGER_COMPARE").value("NOT_PERFORMED")).andExpect(jsonPath("$.DATA[0].REGISTRABLE").value(true)).andExpect(jsonPath("$.DATA[0].REVIEW_STATUS").doesNotExist());
  postJson(f.base()+"/adoptions",adoption(f,0));
  assertEquals(1,programCount(f));
  assertEquals(before,jdbc.queryForMap("SELECT * FROM BSDRGANL WHERE ANALYSIS_ID=?",f.analysis()));
 }
 @Test void registrationReadsTheCurrentRegisterAgain() throws Exception {
  var f=fixture();
  validated(f,"DONE",candidate(f,"구매 등록","NEW","OK",null));
  postJson(f.base(),json.createObjectNode().put("PROGRAM_NAME"," 구매   등록 ").put("DESCRIPTION",""));
  var check=json.readTree(mvc.perform(get(f.base()+"/adoption-check").param("GROUP_ID",f.group()).param("ANALYSIS_ID",f.analysis()).param("CANDIDATE_INDEXES","0")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("DATA");
  assertEquals(1,check.path("NAME_CONFLICTS").size());
  mvc.perform(post(f.base()+"/adoptions").contentType(MediaType.APPLICATION_JSON).content(adoption(f,0).toString())).andExpect(status().isConflict());
  var acknowledged=adoption(f,0);((com.fasterxml.jackson.databind.node.ObjectNode)acknowledged).put("ACKNOWLEDGE_LEDGER_CHANGES",true);
  mvc.perform(post(f.base()+"/adoptions").contentType(MediaType.APPLICATION_JSON).content(acknowledged.toString())).andExpect(status().isConflict());
  assertEquals(1,programCount(f));
 }
 @Test void programsRegisteredAfterTheAnalysisNeedAcknowledgementAndSimilarNamesAreOnlyShown() throws Exception {
  var f=fixture();
  validated(f,"DONE",candidate(f,"구매 등록","NEW","OK",null));
  Thread.sleep(30);
  postJson(f.base(),json.createObjectNode().put("PROGRAM_NAME","구매 등록 관리").put("DESCRIPTION",""));
  var check=json.readTree(mvc.perform(get(f.base()+"/adoption-check").param("GROUP_ID",f.group()).param("ANALYSIS_ID",f.analysis()).param("CANDIDATE_INDEXES","0")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("DATA");
  assertEquals(0,check.path("NAME_CONFLICTS").size());assertEquals(1,check.path("SIMILAR_NAMES").size());assertEquals(1,check.path("ADDED_AFTER_ANALYSIS").size());
  mvc.perform(post(f.base()+"/adoptions").contentType(MediaType.APPLICATION_JSON).content(adoption(f,0).toString())).andExpect(status().isConflict());
  assertEquals(1,programCount(f));
  var acknowledged=adoption(f,0);((com.fasterxml.jackson.databind.node.ObjectNode)acknowledged).put("ACKNOWLEDGE_LEDGER_CHANGES",true);
  postJson(f.base()+"/adoptions",acknowledged);
  assertEquals(2,programCount(f));
 }
}
