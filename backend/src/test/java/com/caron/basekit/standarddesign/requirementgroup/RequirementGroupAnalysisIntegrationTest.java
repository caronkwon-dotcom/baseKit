package com.caron.basekit.standarddesign.requirementgroup;
import com.caron.basekit.standarddesign.llm.*;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import java.util.concurrent.*;
import java.time.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

@SpringBootTest(properties="spring.datasource.url=jdbc:h2:mem:group-analysis-v0;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc @ActiveProfiles("test")
class RequirementGroupAnalysisIntegrationTest {
 @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired JdbcTemplate jdbc;
 @Autowired RequirementGroupAnalysisService service;
 @Autowired org.springframework.transaction.PlatformTransactionManager manager;
 @Autowired LlmProperties properties;
 @MockitoBean DesignLlmClient llm;
 record Group(String id,long version,String req) { }
 JsonNode postJson(String path,JsonNode input) throws Exception { return json.readTree(mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(input.toString())).andExpect(status().is2xxSuccessful()).andReturn().getResponse().getContentAsString()).path("DATA"); }
 Group setup(boolean name) throws Exception {
  String project="GV0-"+UUID.randomUUID().toString().substring(0,8);
  var input=json.createObjectNode().put("PROJECT_ID",project).put("REQUIREMENT_NAME","구매 등록").put("REQUIREMENT_TYPE_CODE","NEW").put("DESCRIPTION","원문\n두 번째 줄").put("PROCESS_DESCRIPTION","등록 → 승인").put("DESIGN_OPINION","목록과 상세 화면 통합 검토").put("STATUS","DRAFT");
  var req=postJson("/api/standard-design/requirements",input);String rid=req.path("REQUIREMENT_ID").asText();
  var g=json.createObjectNode().put("PROJECT_ID",project).put("REQUIREMENT_GROUP_NAME","구매").put("DESCRIPTION","그룹 원문").put("REQUEST_ID",UUID.randomUUID().toString());
  var member=g.putArray("MEMBERS").addObject().put("REQUIREMENT_ID",rid).put("HUMAN_YN","Y").put("INCLUSION_REASON","").put("REVIEWED_REVISION",req.path("REQUIREMENT_REVISION").asLong());member.putArray("SOURCE_ANALYSIS_IDS");
  var saved=postJson("/api/standard-design/requirement-groups",g);String id=saved.path("REQUIREMENT_GROUP_ID").asText();
  var confirmation=json.createObjectNode().put("VERSION",saved.path("VERSION").asLong()); if(name)confirmation.put("PROJECT_NAME","검증 프로젝트");
  saved=postJson("/api/standard-design/requirement-groups/"+id+"/confirm",confirmation);
  return new Group(id,saved.path("VERSION").asLong(),rid);
 }
 String response(String id) {
  return "{\"summary\":{\"text\":\"구매 개요입니다. 등록을 다룹니다. 검토가 필요합니다.\"},\"businessAreas\":[{\"name\":\"구매\",\"description\":\"구매 등록\",\"extra\":{\"kept\":true},\"evidenceRequirementIds\":[\""+id+"\"]}],\"processCandidates\":[],\"programCandidates\":[],\"observations\":[]}";
 }
 Map<String,Object> start(Group g,String request) { return service.execute(g.id(),new RequirementGroupAnalysisService.Execute(g.version(),request)); }
 Map<String,Object> completed(Group g,String id) throws Exception {
  long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(5);
  do {var result=service.get(g.id(),id);if(!"RUNNING".equals(result.get("STATUS")))return result;Thread.sleep(10);}while(System.nanoTime()<end);
  fail("Analysis did not finish");return null;
 }
 Map<String,Object> run(Group g,String request) throws Exception {return completed(g,start(g,request).get("ANALYSIS_ID").toString());}
 void reply(String raw) {doReturn(new DesignLlmClient.LlmChatResult("test",raw)).when(llm).chatRaw(anyString(),anyString(),any());}
 String envelope(String raw,String reason) {
  var out=json.createObjectNode();var choice=out.putArray("choices").addObject();choice.put("finish_reason",reason);choice.putObject("message").put("content",raw);
  out.putObject("usage").put("prompt_tokens",100).put("completion_tokens",50);return " \n"+out+"\n ";
 }
 @Test @org.springframework.transaction.annotation.Transactional
 void menuDraftListingDoesNotExpireAnalysisOrChangeHistory() throws Exception {
  Group g=setup(true);
  String id="GA-readonly-"+UUID.randomUUID().toString().substring(0,8);
  jdbc.update("INSERT INTO BSDRGANL(ANALYSIS_ID,REQUIREMENT_GROUP_ID,GROUP_VERSION,REQUEST_ID,REQUEST_JSON,MODEL_NAME,PROMPT_VERSION,STATUS,DEADLINE_AT) VALUES(?,?,?,?,?,?,?,'RUNNING',?)",id,g.id(),g.version(),id,"{}","test","test",OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(5));
  String before=jdbc.queryForMap("SELECT * FROM BSDRGANL WHERE ANALYSIS_ID=?",id).toString();
  mvc.perform(get("/api/standard-design/requirement-groups/"+g.id()+"/analyses/menu-draft")).andExpect(status().isOk()).andExpect(jsonPath("$.DATA[0].STATUS").value("RUNNING"));
  assertEquals(before,jdbc.queryForMap("SELECT * FROM BSDRGANL WHERE ANALYSIS_ID=?",id).toString());
 }
 @Test void recommendsOutsideGroupAndPreservesRawAndEvidenceWhenAdded() throws Exception {
  Group g=setup(true);
  String project=jdbc.queryForObject("SELECT PROJECT_ID FROM BSDRGRP WHERE REQUIREMENT_GROUP_ID=?",String.class,g.id());
  var candidates=new ArrayList<String>();
  for(int i=0;i<7;i++) {
   var req=postJson("/api/standard-design/requirements",json.createObjectNode().put("PROJECT_ID",project).put("REQUIREMENT_NAME","후속 처리 "+i).put("REQUIREMENT_TYPE_CODE","NEW").put("DESCRIPTION","승인 후 처리").put("PROCESS_DESCRIPTION","승인 → 후속 처리").put("STATUS","DRAFT"));
   candidates.add(req.path("REQUIREMENT_ID").asText());
  }
  mvc.perform(delete("/api/standard-design/requirements/"+candidates.get(6)).contentType(MediaType.APPLICATION_JSON).content("{\"REASON\":\"검토 후 폐기\"}")).andExpect(status().isNoContent());
  // Use a 3-member draft, matching the intended iterative workflow.
  var save=json.createObjectNode().put("PROJECT_ID",project).put("REQUIREMENT_GROUP_NAME","구매").put("DESCRIPTION","반복 보완").put("VERSION",g.version()).put("REQUEST_ID",UUID.randomUUID().toString());
  var members=save.putArray("MEMBERS");
  for(String id:List.of(g.req(),candidates.get(0),candidates.get(1))) {
   var m=members.addObject().put("REQUIREMENT_ID",id).put("HUMAN_YN","Y").put("INCLUSION_REASON","").put("REVIEWED_REVISION",1); m.putArray("SOURCE_ANALYSIS_IDS");
  }
  postJson("/api/standard-design/requirement-groups/"+g.id()+"/edit",json.createObjectNode().put("VERSION",g.version()));
  save.put("VERSION",g.version()+1);
  var saved=json.readTree(mvc.perform(put("/api/standard-design/requirement-groups/"+g.id()).contentType(MediaType.APPLICATION_JSON).content(save.toString())).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("DATA");
  g=new Group(g.id(),saved.path("VERSION").asLong(),g.req());
  var output=json.createObjectNode();var recs=output.putArray("recommendedRequirements");
  for(String id:List.of(candidates.get(2),g.req(),"HALLUCINATION",candidates.get(2),candidates.get(6))) recs.addObject().put("requirementId",id).put("reason","승인 이후 후속 처리입니다.");
  String raw=envelope(output.toString(),"stop");reply(raw);
  var started=service.execute(g.id(),new RequirementGroupAnalysisService.Execute(g.version(),"recommendation",null,"GROUP_RECOMMENDATION"));
  var done=completed(g,started.get("ANALYSIS_ID").toString());
  assertEquals("SUCCESS",done.get("STATUS"));assertEquals(raw,done.get("RESPONSE_RAW_JSON"));
  var input=json.readTree((String)done.get("REQUEST_JSON"));assertEquals(3,input.path("requirements").size());assertEquals(4,input.path("candidateRequirements").size());
  var result=((JsonNode)done.get("RESPONSE")).path("recommendedRequirements");assertEquals(1,result.size());assertEquals(candidates.get(2),result.get(0).path("requirementId").asText());
  String analysis=done.get("ANALYSIS_ID").toString();
  var source=json.readTree(mvc.perform(get("/api/standard-design/requirement-analysis-sources/"+analysis)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("DATA");
  assertEquals("승인 이후 후속 처리입니다.",source.path("ITEMS").get(0).path("ORIGINAL_REASON").asText());
  var histories=json.readTree(mvc.perform(get("/api/standard-design/requirement-analysis-sources").param("PROJECT_ID",project)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("DATA");
  assertTrue(histories.toString().contains(analysis));
  save.put("VERSION",g.version()).put("REQUEST_ID",UUID.randomUUID().toString());
  members.addObject().put("REQUIREMENT_ID",candidates.get(2)).put("HUMAN_YN","N").put("INCLUSION_REASON","").put("REVIEWED_REVISION",1).putArray("SOURCE_ANALYSIS_IDS").add(analysis);
  var added=json.readTree(mvc.perform(put("/api/standard-design/requirement-groups/"+g.id()).contentType(MediaType.APPLICATION_JSON).content(save.toString())).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("DATA");
  assertEquals(4,added.path("MEMBERS").size());assertTrue(added.path("MEMBERS").toString().contains(analysis));assertEquals("DRAFT",added.path("GROUP_STATUS").asText());
  assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM BSDRGREV WHERE ANALYSIS_ID=? AND REQUIREMENT_ID=?",Integer.class,analysis,candidates.get(2)));
  members.add(members.get(3));save.put("VERSION",added.path("VERSION").asLong()).put("REQUEST_ID",UUID.randomUUID().toString());
  mvc.perform(put("/api/standard-design/requirement-groups/"+g.id()).contentType(MediaType.APPLICATION_JSON).content(save.toString())).andExpect(status().isBadRequest());
 }
 @Test void recommendationLimitsAndStrictJsonAreValidated() {
  String input="{\"requirements\":[{\"requirementId\":\"MEMBER\"}],\"candidateRequirements\":[{\"requirementId\":\"CANDIDATE\"}]}";
  var output=json.createObjectNode();var items=output.putArray("recommendedRequirements");
  items.addObject().put("requirementId","CANDIDATE").put("reason","짧은 이유입니다.");assertEquals(1,service.recommendationResult(output.toString(),input).path("recommendedRequirements").size());
  ((com.fasterxml.jackson.databind.node.ObjectNode)items.get(0)).put("reason","가".repeat(201));
  assertThrows(IllegalArgumentException.class,()->service.recommendationResult(output.toString(),input));
  ((com.fasterxml.jackson.databind.node.ObjectNode)items.get(0)).put("reason","첫째. 둘째. 셋째.");assertThrows(IllegalArgumentException.class,()->service.recommendationResult(output.toString(),input));
  ((com.fasterxml.jackson.databind.node.ObjectNode)items.get(0)).put("reason","짧은 이유");for(int i=0;i<5;i++)items.add(items.get(0).deepCopy());
  assertThrows(IllegalArgumentException.class,()->service.recommendationResult(output.toString(),input));
  assertThrows(IllegalArgumentException.class,()->service.recommendationResult("설명 "+output,input));
 }
 @Test void returns202ImmediatelyAndIdempotencyRetainsImmutableInputDuringCall() throws Exception {
  Group g=setup(true);var called=new CountDownLatch(1);var release=new CountDownLatch(1);
  when(llm.chatRaw(anyString(),anyString(),any())).thenAnswer(invocation->{called.countDown();assertTrue(release.await(5,TimeUnit.SECONDS));return new DesignLlmClient.LlmChatResult("test",response(g.req()));});
  long before=System.nanoTime();
  var result=json.readTree(mvc.perform(post("/api/standard-design/requirement-groups/"+g.id()+"/analyses").contentType(MediaType.APPLICATION_JSON).content(json.createObjectNode().put("VERSION",g.version()).put("REQUEST_ID","async").toString())).andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString()).path("DATA");
  String id=result.path("ANALYSIS_ID").asText();
  try {
   assertTrue(TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-before)<1000);assertEquals("RUNNING",result.path("STATUS").asText());assertTrue(called.await(2,TimeUnit.SECONDS));
   assertEquals(id,start(g,"async").get("ANALYSIS_ID"));assertThrows(org.springframework.web.server.ResponseStatusException.class,()->start(g,"different"));
   var input=json.readTree(result.path("REQUEST_JSON").asText());assertEquals(g.id(),input.path("group").path("groupId").asText());
   mvc.perform(delete("/api/standard-design/requirements/"+g.req()).contentType(MediaType.APPLICATION_JSON).content("{\"REASON\":\"검토 후 폐기\"}")).andExpect(status().isNoContent());
  }finally{release.countDown();}
  var done=completed(g,id);assertEquals("SUCCESS",done.get("STATUS"));assertEquals(1,json.readTree((String)done.get("REQUEST_JSON")).path("requirements").get(0).path("revision").asLong());
  assertEquals("N",json.readTree((String)done.get("REQUEST_JSON")).path("requirements").get(0).path("discardedYn").asText());
  verify(llm,times(1)).chatRaw(eq(RequirementGroupAnalysisService.PROMPT),startsWith((String)done.get("REQUEST_JSON")),argThat(o->o.maxTokens()==2048 && !o.enableThinking() && o.timeoutSeconds()==60));
 }
 @Test void preservesExactRawUnknownFieldsAndIndependentRuns() throws Exception {
  Group g=setup(true);String raw=envelope(response(g.req()),"stop");reply(raw);var first=run(g,"one");
  assertEquals("SUCCESS",first.get("STATUS"));assertEquals(raw,first.get("RESPONSE_RAW_JSON"));assertEquals("stop",first.get("FINISH_REASON"));assertEquals(50L,((Number)first.get("OUTPUT_TOKENS")).longValue());
  assertTrue(((JsonNode)first.get("RESPONSE")).path("businessAreas").get(0).path("extra").path("kept").asBoolean());assertEquals(List.of(),first.get("WARNINGS"));
  assertEquals(first.get("ANALYSIS_ID"),start(g,"one").get("ANALYSIS_ID"));assertNotEquals(first.get("ANALYSIS_ID"),run(g,"two").get("ANALYSIS_ID"));assertEquals(2,service.list(g.id()).size());
  assertEquals(raw,jdbc.queryForObject("SELECT RESPONSE_RAW_JSON FROM BSDRGANL WHERE ANALYSIS_ID=?",String.class,first.get("ANALYSIS_ID")));
 }
 @Test void differentiatesInvalidJsonTruncationAndHttpFailureWhileKeepingRaw() throws Exception {
  Group g=setup(true);
  for(String raw:List.of("not JSON","{}",response(g.req())+" {}","{\"choices\":[]}")) {
   reply(raw);var result=run(g,UUID.randomUUID().toString());assertEquals("FAILED_INVALID_JSON",result.get("STATUS"));assertEquals(raw,result.get("RESPONSE_RAW_JSON"));
  }
  for(String raw:List.of(envelope("{","length"),envelope(response(g.req()),"length"),envelope("{\"summary\":", "stop"))) {
   reply(raw);var result=run(g,UUID.randomUUID().toString());assertEquals("FAILED_TRUNCATED",result.get("STATUS"));assertEquals(raw,result.get("RESPONSE_RAW_JSON"));assertFalse(result.containsKey("RESPONSE"));
  }
  doReturn(new DesignLlmClient.LlmChatResult("test","provider body",429)).when(llm).chatRaw(anyString(),anyString(),any());
  var denied=run(g,"http");assertEquals("FAILED_LLM",denied.get("STATUS"));assertEquals("provider body",denied.get("RESPONSE_RAW_JSON"));assertTrue(denied.get("ERROR_MESSAGE").toString().contains("HTTP 429"));
 }
 @Test void differentiatesTimeoutFromModelFailureAndDoesNotRetryAutomatically() throws Exception {
  Group g=setup(true);
  doThrow(new LlmConnectionException(LlmConnectionException.Failure.TIMEOUT,null,"secret body")).when(llm).chatRaw(anyString(),anyString(),any());
  var failed=run(g,"timeout");assertEquals("FAILED_TIMEOUT",failed.get("STATUS"));assertNull(failed.get("RESPONSE_RAW_JSON"));assertFalse(failed.get("ERROR_MESSAGE").toString().contains("secret"));
  start(g,"timeout");verify(llm,times(1)).chatRaw(anyString(),anyString(),any());
  doThrow(new RuntimeException("secret body")).when(llm).chatRaw(anyString(),anyString(),any());
  assertEquals("FAILED_LLM",run(g,"model").get("STATUS"));
 }
 @Test void warnsOnEvidenceErrorsAndRejectsOverlargeCandidates() throws Exception {
  Group g=setup(true);var value=json.readTree(response("UNKNOWN"));var areas=(com.fasterxml.jackson.databind.node.ArrayNode)value.path("businessAreas");
  areas.addObject().put("name","근거 없음").put("description","").putArray("evidenceRequirementIds");
  reply(value.toString());var result=run(g,"bad-evidence");assertEquals("SUCCESS",result.get("STATUS"));assertEquals(2,((List<?>)result.get("WARNINGS")).size());
  var source=json.readTree(mvc.perform(get("/api/standard-design/requirement-analysis-sources/"+result.get("ANALYSIS_ID"))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("DATA");
  assertEquals(0,source.path("ITEMS").size());
  areas.add(areas.get(0));areas.add(areas.get(0));reply(value.toString());assertEquals("FAILED_INVALID_JSON",run(g,"too-many").get("STATUS"));
 }
 @Test void expiredRunningCannotOverwriteTerminalStateButLateRawIsKept() throws Exception {
  Group g=setup(true);var called=new CountDownLatch(1);var release=new CountDownLatch(1);
  when(llm.chatRaw(anyString(),anyString(),any())).thenAnswer(invocation->{called.countDown();assertTrue(release.await(5,TimeUnit.SECONDS));return new DesignLlmClient.LlmChatResult("test",response(g.req()));});
  var started=start(g,"expiry");String id=started.get("ANALYSIS_ID").toString();assertTrue(called.await(2,TimeUnit.SECONDS));
  try {jdbc.update("UPDATE BSDRGANL SET DEADLINE_AT=? WHERE ANALYSIS_ID=?",OffsetDateTime.now(ZoneOffset.UTC).minusSeconds(1),id);service.expireRunning();assertEquals("FAILED_TIMEOUT",service.get(g.id(),id).get("STATUS"));}
  finally{release.countDown();}
  long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(3);while(service.get(g.id(),id).get("RESPONSE_RAW_JSON")==null && System.nanoTime()<end)Thread.sleep(10);
  assertEquals(response(g.req()),service.get(g.id(),id).get("RESPONSE_RAW_JSON"));assertEquals("FAILED_TIMEOUT",service.get(g.id(),id).get("STATUS"));
 }
 @Test void hardDeadlineStopsWaitingEvenWhenClientDoesNotComplete() throws Exception {
  Group g=setup(true);var called=new CountDownLatch(1);
  when(llm.chatRaw(anyString(),anyString(),any())).thenAnswer(invocation->{called.countDown();Thread.sleep(5000);return new DesignLlmClient.LlmChatResult("test",response(g.req()));});
  var shortService=new RequirementGroupAnalysisService(jdbc,json,llm,properties,manager,1,2048);
  try {
   var start=shortService.execute(g.id(),new RequirementGroupAnalysisService.Execute(g.version(),"hard-deadline"));assertTrue(called.await(2,TimeUnit.SECONDS));
   var result=completed(g,start.get("ANALYSIS_ID").toString());assertEquals("FAILED_TIMEOUT",result.get("STATUS"));assertNull(result.get("RESPONSE_RAW_JSON"));
  }finally{shortService.close();}
 }
 @Test void createsCurrentSnapshotWithoutConfirmationAndRejectsStaleVersion() throws Exception {
  Group g=setup(false);
  reply(response(g.req())); var first=run(g,"legacy"); assertEquals("SUCCESS",first.get("STATUS"));
  var saved=postJson("/api/standard-design/requirement-groups/"+g.id()+"/edit",json.createObjectNode().put("VERSION",g.version()));
  assertEquals("DRAFT",saved.path("GROUP_STATUS").asText());assertThrows(org.springframework.web.server.ResponseStatusException.class,()->start(g,"stale"));
 }
 @Test void draftReviewReanalysisAndSourceProjectionKeepOriginalEvidence() throws Exception {
  Group confirmed=setup(true);
  var draft=postJson("/api/standard-design/requirement-groups/"+confirmed.id()+"/edit",json.createObjectNode().put("VERSION",confirmed.version()));
  Group g=new Group(confirmed.id(),draft.path("VERSION").asLong(),confirmed.req());
  reply(response(g.req()));var first=run(g,"draft-one");
  assertEquals("DRAFT",jdbc.queryForObject("SELECT GROUP_STATUS FROM BSDRGRP WHERE REQUIREMENT_GROUP_ID=?",String.class,g.id()));
  var project=json.readTree((String)first.get("REQUEST_JSON")).path("project").path("projectId").asText();
  var sources=json.readTree(mvc.perform(get("/api/standard-design/requirement-analysis-sources").param("PROJECT_ID",project)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("DATA");
  assertTrue(sources.size()>0);assertEquals("구매 · 구매 등록",sources.get(0).path("ITEMS").get(0).path("ORIGINAL_REASON").asText());
  assertEquals(0,json.readTree(mvc.perform(get("/api/standard-design/requirement-analysis-sources").param("PROJECT_ID","FOREIGN")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("DATA").size());
  var newRequirement=postJson("/api/standard-design/requirements",json.createObjectNode().put("PROJECT_ID",project).put("REQUIREMENT_NAME","추가 구매 승인").put("REQUIREMENT_TYPE_CODE","NEW").put("DESCRIPTION","추가 원문").put("STATUS","DRAFT"));
  var save=(com.fasterxml.jackson.databind.node.ObjectNode)draft.deepCopy();save.put("REQUIREMENT_GROUP_NAME","수정한 구매 그룹");
  var member=((com.fasterxml.jackson.databind.node.ArrayNode)save.path("MEMBERS")).addObject().put("REQUIREMENT_ID",newRequirement.path("REQUIREMENT_ID").asText()).put("HUMAN_YN","Y").put("INCLUSION_REASON","").put("REVIEWED_REVISION",1);member.putArray("SOURCE_ANALYSIS_IDS");
  var ids=(com.fasterxml.jackson.databind.node.ArrayNode)save.path("MEMBERS").get(0).path("SOURCE_ANALYSIS_IDS");ids.add(first.get("ANALYSIS_ID").toString());
  var edited=json.readTree(mvc.perform(put("/api/standard-design/requirement-groups/"+g.id()).contentType(MediaType.APPLICATION_JSON).content(save.toString())).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("DATA");
  Group changed=new Group(g.id(),edited.path("VERSION").asLong(),g.req());var second=run(changed,"draft-two");
  assertNotEquals(first.get("ANALYSIS_ID"),second.get("ANALYSIS_ID"));assertEquals(2,service.list(g.id()).size());
  assertEquals(2,json.readTree((String)second.get("REQUEST_JSON")).path("requirements").size());
  assertEquals(1,json.readTree((String)first.get("REQUEST_JSON")).path("requirements").size());
  assertEquals("수정한 구매 그룹",json.readTree((String)second.get("REQUEST_JSON")).path("group").path("groupName").asText());
  assertEquals("구매",json.readTree((String)first.get("REQUEST_JSON")).path("group").path("groupName").asText());
  var reconfirm=postJson("/api/standard-design/requirement-groups/"+g.id()+"/confirm",json.createObjectNode().put("VERSION",changed.version()).put("PROJECT_NAME","프로젝트"));
  assertEquals("CONFIRMED",reconfirm.path("GROUP_STATUS").asText());
  mvc.perform(delete("/api/standard-design/requirements/"+g.req()).contentType(MediaType.APPLICATION_JSON).content("{\"REASON\":\"검토 후 폐기\"}")).andExpect(status().isNoContent());
  var review=json.readTree(mvc.perform(get("/api/standard-design/requirement-groups/"+g.id())).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("DATA");
  assertEquals("REVIEW_REQUIRED",review.path("GROUP_STATUS").asText());
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->run(new Group(g.id(),review.path("VERSION").asLong(),g.req()),"review"));
  assertEquals(2,service.list(g.id()).size());
  for(var reviewed:review.path("MEMBERS")) if(g.req().equals(reviewed.path("REQUIREMENT_ID").asText())) assertEquals(1,reviewed.path("SOURCE_ANALYSIS_IDS").size());
 }
 @Test void legacyResultsAndRawRemainReadable() throws Exception {
  Group g=setup(true);reply(response(g.req()));var run=run(g,"legacy-result");String id=run.get("ANALYSIS_ID").toString();
  String raw="{\"summary\":{\"text\":\"기존 결과\"},\"businessStructure\":[],\"processes\":[],\"screenCandidates\":[],\"programCandidates\":[],\"observations\":[]}";
  jdbc.update("UPDATE BSDRGANL SET STATUS='SUCCEEDED',LEGACY_STATUS='SUCCEEDED',PROMPT_VERSION='group-analysis-v0.1',RESPONSE_RAW_JSON=? WHERE ANALYSIS_ID=?",raw,id);
  var saved=service.get(g.id(),id);assertEquals(raw,saved.get("RESPONSE_RAW_JSON"));assertNotNull(saved.get("RESPONSE"));assertEquals("SUCCEEDED",saved.get("STATUS"));
 }
 @Test void programListResultKeepsExactIdsAndPreservesUncoveredRequirements() {
  String input="{\"requirements\":[{\"requirementId\":\"A\"},{\"requirementId\":\"B\"},{\"requirementId\":\"C\"}]}";
  var output=json.createObjectNode();var programs=output.putArray("programs");
  programs.addObject().put("name","구매 목록").put("type","batch").put("purpose","구매를 조회합니다.").putArray("requirementIds").add("A").add("A").add("HALLUCINATION");
  programs.addObject().put("name","근거 없음").put("purpose","무시됩니다.").putArray("requirementIds").add("NOPE");
  output.putArray("unclassified").addObject().put("requirementId","B").put("reason","불명확합니다.");
  var result=service.programsResult(output.toString(),input);
  // A program whose evidence is invalid is kept for review instead of silently disappearing.
  assertEquals(2,result.path("programCandidates").size());
  assertEquals("REVIEW_REQUIRED",result.path("programCandidates").get(1).path("reviewStatus").asText());
  assertEquals("NO_VALID_EVIDENCE",result.path("programCandidates").get(1).path("issues").get(0).asText());
  assertEquals("BATCH",result.path("programCandidates").get(0).path("type").asText());
  assertEquals(1,result.path("programCandidates").get(0).path("evidenceRequirementIds").size());
  assertEquals(2,result.path("unclassified").size());
  assertEquals("B",result.path("unclassified").get(0).path("requirementId").asText());
  assertEquals("불명확합니다.",result.path("unclassified").get(0).path("reason").asText());
  assertEquals("C",result.path("unclassified").get(1).path("requirementId").asText());
  var unknownKind=json.createObjectNode();unknownKind.putArray("programs").addObject().put("name","구매").put("type","WIDGET").put("purpose","설명").putArray("requirementIds").add("A");
  assertTrue(service.programsResult(unknownKind.toString(),input).path("programCandidates").get(0).path("type").isMissingNode());
  assertThrows(IllegalArgumentException.class,()->service.programsResult("{\"programs\":[]}",input));
  assertThrows(IllegalArgumentException.class,()->service.programsResult("설명 "+output,input));
  ((com.fasterxml.jackson.databind.node.ObjectNode)programs.get(0)).put("name","가".repeat(101));
  assertThrows(IllegalArgumentException.class,()->service.programsResult(output.toString(),input));
 }
 @Test void groupProgramsAnalysisStoresValidatedCandidatesAndRejectsInvalidResponses() throws Exception {
  Group g=setup(true);
  var output=json.createObjectNode();
  output.putArray("programs").addObject().put("name","구매 등록").put("purpose","구매를 등록합니다.").putArray("requirementIds").add(g.req());
  reply(output.toString());
  var done=completed(g,service.execute(g.id(),new RequirementGroupAnalysisService.Execute(g.version(),"programs",null,"GROUP_PROGRAMS")).get("ANALYSIS_ID").toString());
  assertEquals("SUCCESS",done.get("STATUS"));assertEquals("GROUP_PROGRAMS",done.get("ANALYSIS_TYPE"));assertEquals("group-programs-v0.3",done.get("PROMPT_VERSION"));
  var response=(JsonNode)done.get("RESPONSE");
  assertEquals(g.req(),response.path("programCandidates").get(0).path("evidenceRequirementIds").get(0).asText());
  assertEquals(0,response.path("unclassified").size());
  assertTrue(((String)done.get("REQUEST_JSON")).contains("inclusionReason"));
  reply("{\"programs\":[]}");
  var failed=completed(g,service.execute(g.id(),new RequirementGroupAnalysisService.Execute(g.version(),"programs-invalid",null,"GROUP_PROGRAMS")).get("ANALYSIS_ID").toString());
  assertEquals("FAILED_INVALID_JSON",failed.get("STATUS"));assertNotNull(failed.get("RESPONSE_RAW_JSON"));
 }
 String ledgerInput(String project,String... programIds) {
  var input=json.createObjectNode();input.putObject("project").put("projectId",project);
  var requirements=input.putArray("requirements");for(String id:List.of("A","B","C"))requirements.addObject().put("requirementId",id);
  var existing=input.putArray("existingPrograms");for(String id:programIds)existing.addObject().put("programId",id).put("name","기존 "+id).put("kind","SCREEN");
  input.putObject("existingProgramsInfo").put("total",programIds.length).put("included",programIds.length).put("omitted",0).put("detail","FULL");
  return input.toString();
 }
 JsonNode program(String decision,String existingId,String... requirementIds) {
  var item=json.createObjectNode().put("name","프로그램 "+decision).put("type","SCREEN").put("purpose","설명").put("reason","근거");
  if(decision!=null)item.put("decision",decision);
  if(existingId!=null)item.put("existingProgramId",existingId);
  var ids=item.putArray("requirementIds");for(String id:requirementIds)ids.add(id);
  return item;
 }
 com.fasterxml.jackson.databind.node.ObjectNode only(JsonNode... programs) {var output=json.createObjectNode();var array=output.putArray("programs");for(var p:programs)array.add(p);return output;}
 @Test void wrongLedgerJudgmentsAreFlaggedForReviewAndNeverTurnedIntoNew() throws Exception {
  String project="LV-"+UUID.randomUUID().toString().substring(0,8),other="LV-"+UUID.randomUUID().toString().substring(0,8);
  var mine=postJson("/api/standard-design/projects/"+project+"/programs",json.createObjectNode().put("PROGRAM_NAME","내 프로그램").put("DESCRIPTION","")).path("PROGRAM_ID").asText();
  var foreign=postJson("/api/standard-design/projects/"+other+"/programs",json.createObjectNode().put("PROGRAM_NAME","남의 프로그램").put("DESCRIPTION","")).path("PROGRAM_ID").asText();
  var sentOnly="SDPG-sent";
  String input=ledgerInput(project,sentOnly);
  var output=only(program("REUSE",sentOnly,"A"),program("CHANGE","SDPG-nowhere","B"),program("REUSE",foreign,"B"),program("REUSE",mine,"C"),
   program("REUSE",null,"C"),program(null,null,"A"),program("MAYBE",null,"A"),program("NEW",sentOnly,"A"),program("NEW",null,"B"));
  var candidates=service.programsResult(output.toString(),input).path("programCandidates");
  assertEquals("OK",candidates.get(0).path("reviewStatus").asText());
  assertEquals(sentOnly,candidates.get(0).path("existing").path("programId").asText());
  assertEquals("기존 "+sentOnly,candidates.get(0).path("existing").path("name").asText());
  assertEquals("EXISTING_ID_UNKNOWN",candidates.get(1).path("issues").get(0).asText());
  assertEquals("EXISTING_ID_OTHER_PROJECT",candidates.get(2).path("issues").get(0).asText());
  assertEquals("EXISTING_ID_NOT_PROVIDED",candidates.get(3).path("issues").get(0).asText());
  assertEquals("EXISTING_ID_MISSING",candidates.get(4).path("issues").get(0).asText());
  assertEquals("DECISION_MISSING",candidates.get(5).path("issues").get(0).asText());
  assertEquals("DECISION_INVALID",candidates.get(6).path("issues").get(0).asText());
  assertEquals("NEW_WITH_EXISTING_ID",candidates.get(7).path("issues").get(0).asText());
  assertEquals("OK",candidates.get(8).path("reviewStatus").asText());
  for(int i=1;i<=7;i++) assertEquals("REVIEW_REQUIRED",candidates.get(i).path("reviewStatus").asText(),"candidate "+i);
  // What the model said is preserved, not rewritten into NEW.
  assertEquals("CHANGE",candidates.get(1).path("decision").asText());
  assertEquals("SDPG-nowhere",candidates.get(1).path("existingProgramId").asText());
  assertTrue(candidates.get(1).path("existing").isMissingNode());
  assertTrue(service.programsResult(output.toString(),input).path("ledgerCompare").path("performed").asBoolean());
 }
 @Test void ledgerWarningsDoNotBlockAndPartialInputIsReported() throws Exception {
  var kinds=json.createObjectNode().put("name","유형 다름").put("type","BATCH").put("purpose","설명").put("decision","REUSE").put("existingProgramId","P1");kinds.putArray("requirementIds").add("A");
  var again=json.createObjectNode().put("name","같은 대상").put("type","SCREEN").put("purpose","설명").put("decision","CHANGE").put("existingProgramId","P1");again.putArray("requirementIds").add("B");
  var partial=json.readTree("{\"project\":{\"projectId\":\"X\"},\"requirements\":[{\"requirementId\":\"A\"},{\"requirementId\":\"B\"},{\"requirementId\":\"C\"}],\"existingPrograms\":[{\"programId\":\"P1\",\"name\":\"하나\",\"kind\":\"SCREEN\"}],\"existingProgramsInfo\":{\"total\":5,\"included\":1,\"omitted\":4,\"detail\":\"RELEVANT\"}}");
  var result=service.programsResult(only(kinds,again).toString(),partial.toString());
  var list=result.path("programCandidates");
  assertEquals("OK",list.get(0).path("reviewStatus").asText());
  assertTrue(list.get(0).path("warnings").toString().contains("KIND_MISMATCH"));
  assertTrue(list.get(0).path("warnings").toString().contains("DUPLICATE_EXISTING_TARGET"));
  assertTrue(list.get(1).path("warnings").toString().contains("CHANGE_SUMMARY_MISSING"));
  assertTrue(result.path("ledgerCompare").path("partial").asBoolean());
  assertEquals(4,result.path("ledgerCompare").path("omitted").asInt());
 }
 @Test void everyRequirementIsEitherLinkedOrUnclassified() {
  String input=ledgerInput("P");
  var output=only(program("NEW",null,"A","ZZZ"));
  var declared=output.putArray("unclassified");
  declared.addObject().put("requirementId","B").put("reason","불명확");
  declared.addObject().put("requirementId","A").put("reason","중복 선언");
  declared.addObject().put("requirementId","UNKNOWN").put("reason","없는 ID");
  var result=service.programsResult(output.toString(),input);
  var coverage=result.path("coverage");
  assertEquals(3,coverage.path("total").asInt());assertEquals(1,coverage.path("covered").asInt());
  assertEquals(1,coverage.path("unclassifiedByAi").asInt());assertEquals(1,coverage.path("unclassifiedByServer").asInt());
  assertEquals(1,coverage.path("conflictsRemoved").asInt());assertEquals(2,coverage.path("ignoredUnknownIds").asInt());
  assertEquals("B",result.path("unclassified").get(0).path("requirementId").asText());assertEquals("AI",result.path("unclassified").get(0).path("source").asText());
  assertEquals("C",result.path("unclassified").get(1).path("requirementId").asText());assertEquals("SERVER",result.path("unclassified").get(1).path("source").asText());
 }
 @Test void analysisInputCarriesTheRegisterAndNewProjectsStillWork() throws Exception {
  Group g=setup(true);
  String project=jdbc.queryForObject("SELECT PROJECT_ID FROM BSDRGRP WHERE REQUIREMENT_GROUP_ID=?",String.class,g.id());
  var output=only(program("NEW",null,g.req()));
  reply(output.toString());
  var first=completed(g,service.execute(g.id(),new RequirementGroupAnalysisService.Execute(g.version(),"fresh",null,"GROUP_PROGRAMS")).get("ANALYSIS_ID").toString());
  var emptyInput=json.readTree((String)first.get("REQUEST_JSON"));
  assertEquals("SUCCESS",first.get("STATUS"));
  assertTrue(emptyInput.path("existingPrograms").isMissingNode());
  assertEquals(0,emptyInput.path("existingProgramsInfo").path("total").asInt());assertEquals("NONE",emptyInput.path("existingProgramsInfo").path("detail").asText());
  assertTrue(emptyInput.path("existingProgramsInfo").path("requirementsChars").asInt()>0);
  assertTrue(((JsonNode)first.get("RESPONSE")).path("ledgerCompare").path("performed").asBoolean());
  postJson("/api/standard-design/projects/"+project+"/programs",json.createObjectNode().put("PROGRAM_NAME","기존 주문 관리").put("DESCRIPTION","주문을 관리합니다."));
  reply(output.toString());
  var second=completed(g,service.execute(g.id(),new RequirementGroupAnalysisService.Execute(g.version(),"with-ledger",null,"GROUP_PROGRAMS")).get("ANALYSIS_ID").toString());
  var input=json.readTree((String)second.get("REQUEST_JSON"));
  assertEquals(1,input.path("existingPrograms").size());
  assertEquals("기존 주문 관리",input.path("existingPrograms").get(0).path("name").asText());
  assertEquals("FULL",input.path("existingProgramsInfo").path("detail").asText());assertEquals(0,input.path("existingProgramsInfo").path("omitted").asInt());
 }
 @Test void configuredInputLimitReducesTheRegisterAndNeverCutsRequirements() throws Exception {
  Group g=setup(true);
  String project=jdbc.queryForObject("SELECT PROJECT_ID FROM BSDRGRP WHERE REQUIREMENT_GROUP_ID=?",String.class,g.id());
  for(int i=0;i<12;i++)postJson("/api/standard-design/projects/"+project+"/programs",json.createObjectNode().put("PROGRAM_NAME","프로그램 "+i).put("DESCRIPTION","설명 ".repeat(40)));
  var reader=new com.caron.basekit.standarddesign.program.ProgramLedgerReader(jdbc,json);
  var snapshot=jdbc.queryForObject("SELECT REQUEST_JSON FROM BSDRGCTX WHERE REQUIREMENT_GROUP_ID=? AND GROUP_VERSION=?",String.class,g.id(),g.version());
  int base=snapshot.length()+RequirementGroupAnalysisService.PROGRAMS_PROMPT.length();
  var tight=new RequirementGroupAnalysisService(jdbc,json,llm,properties,manager,60,2048,reader,base+800,0);
  reply(only(program("NEW",null,g.req())).toString());
  var done=completed(g,tight.execute(g.id(),new RequirementGroupAnalysisService.Execute(g.version(),"tight",null,"GROUP_PROGRAMS")).get("ANALYSIS_ID").toString());
  var info=json.readTree((String)done.get("REQUEST_JSON")).path("existingProgramsInfo");
  assertEquals(12,info.path("total").asInt());
  assertEquals(info.path("total").asInt(),info.path("included").asInt()+info.path("omitted").asInt());
  assertNotEquals("FULL",info.path("detail").asText());
  assertEquals(base+800,info.path("maxInputChars").asInt());
  assertEquals(1,json.readTree((String)done.get("REQUEST_JSON")).path("requirements").size());
  var impossible=new RequirementGroupAnalysisService(jdbc,json,llm,properties,manager,60,2048,reader,10,0);
  var rejected=org.junit.jupiter.api.Assertions.assertThrows(org.springframework.web.server.ResponseStatusException.class,()->impossible.execute(g.id(),new RequirementGroupAnalysisService.Execute(g.version(),"impossible",null,"GROUP_PROGRAMS")));
  assertEquals(400,rejected.getStatusCode().value());
  assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM BSDRGANL WHERE REQUIREMENT_GROUP_ID=? AND REQUEST_ID='impossible'",Integer.class,g.id()));
 }
}
