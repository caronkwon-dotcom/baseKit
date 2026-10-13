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
 @Test void recommendsOutsideGroupAndPreservesRawAndEvidenceWhenAdded() throws Exception {
  Group g=setup(true);
  String project=jdbc.queryForObject("SELECT PROJECT_ID FROM BSDRGRP WHERE REQUIREMENT_GROUP_ID=?",String.class,g.id());
  var candidates=new ArrayList<String>();
  for(int i=0;i<7;i++) {
   var req=postJson("/api/standard-design/requirements",json.createObjectNode().put("PROJECT_ID",project).put("REQUIREMENT_NAME","후속 처리 "+i).put("REQUIREMENT_TYPE_CODE","NEW").put("DESCRIPTION","승인 후 처리").put("PROCESS_DESCRIPTION","승인 → 후속 처리").put("STATUS","DRAFT"));
   candidates.add(req.path("REQUIREMENT_ID").asText());
  }
  mvc.perform(delete("/api/standard-design/requirements/"+candidates.get(6))).andExpect(status().isNoContent());
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
   mvc.perform(delete("/api/standard-design/requirements/"+g.req())).andExpect(status().isNoContent());
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
  mvc.perform(delete("/api/standard-design/requirements/"+g.req())).andExpect(status().isNoContent());
  var review=json.readTree(mvc.perform(get("/api/standard-design/requirement-groups/"+g.id())).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("DATA");
  assertEquals("REVIEW_REQUIRED",review.path("GROUP_STATUS").asText());
  var third=run(new Group(g.id(),review.path("VERSION").asLong(),g.req()),"review");
  for(var original:json.readTree((String)third.get("REQUEST_JSON")).path("requirements")) if(g.req().equals(original.path("requirementId").asText())) assertEquals("Y",original.path("discardedYn").asText());
  assertEquals(3,service.list(g.id()).size());
  for(var reviewed:review.path("MEMBERS")) if(g.req().equals(reviewed.path("REQUIREMENT_ID").asText())) assertEquals(1,reviewed.path("SOURCE_ANALYSIS_IDS").size());
 }
 @Test void legacyResultsAndRawRemainReadable() throws Exception {
  Group g=setup(true);reply(response(g.req()));var run=run(g,"legacy-result");String id=run.get("ANALYSIS_ID").toString();
  String raw="{\"summary\":{\"text\":\"기존 결과\"},\"businessStructure\":[],\"processes\":[],\"screenCandidates\":[],\"programCandidates\":[],\"observations\":[]}";
  jdbc.update("UPDATE BSDRGANL SET STATUS='SUCCEEDED',LEGACY_STATUS='SUCCEEDED',PROMPT_VERSION='group-analysis-v0.1',RESPONSE_RAW_JSON=? WHERE ANALYSIS_ID=?",raw,id);
  var saved=service.get(g.id(),id);assertEquals(raw,saved.get("RESPONSE_RAW_JSON"));assertNotNull(saved.get("RESPONSE"));assertEquals("SUCCEEDED",saved.get("STATUS"));
 }
}
