package com.caron.basekit.standarddesign.requirementgroup;
import com.caron.basekit.standarddesign.llm.DesignLlmClient;
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
 String response(String id) { return "{\"summary\":{\"text\":\"요약\"},\"businessStructure\":[{\"title\":\"구매\",\"extra\":{\"kept\":true},\"evidenceRequirementIds\":[\""+id+"\"]}],\"processes\":[],\"screenCandidates\":[],\"programCandidates\":[],\"observations\":[]}"; }
 Map<String,Object> run(Group g,String request) { return service.execute(g.id(),new RequirementGroupAnalysisService.Execute(g.version(),request)); }
 @Test void preservesExactRawSnapshotUnknownFieldsAndPreviousRunsWithIdempotency() throws Exception {
  Group g=setup(true); String raw=" \n"+response(g.req())+"\n ";
  when(llm.chatRaw(anyString(),anyString())).thenReturn(new DesignLlmClient.LlmChatResult("test-model",raw));
  var first=run(g,"request-1");assertEquals("SUCCEEDED",first.get("STATUS"));assertEquals(raw,first.get("RESPONSE_RAW_JSON"));assertEquals("test-model",first.get("MODEL_NAME"));
  var input=json.readTree((String)first.get("REQUEST_JSON"));assertEquals("검증 프로젝트",input.path("project").path("projectName").asText());
  assertEquals("원문\n두 번째 줄",input.path("requirements").get(0).path("description").asText());assertEquals("목록과 상세 화면 통합 검토",input.path("requirements").get(0).path("designOpinion").asText());
  assertTrue(((JsonNode)first.get("RESPONSE")).path("businessStructure").get(0).path("extra").path("kept").asBoolean());assertEquals(List.of(),first.get("WARNINGS"));
  assertEquals(first.get("ANALYSIS_ID"),run(g,"request-1").get("ANALYSIS_ID"));verify(llm,times(1)).chatRaw(anyString(),eq((String)first.get("REQUEST_JSON")));
  assertNotEquals(first.get("ANALYSIS_ID"),run(g,"request-2").get("ANALYSIS_ID"));assertEquals(2,service.list(g.id()).size());
  assertEquals(raw,jdbc.queryForObject("SELECT RESPONSE_RAW_JSON FROM BSDRGANL WHERE ANALYSIS_ID=?",String.class,first.get("ANALYSIS_ID")));
 }
 @Test void rawIsCommittedBeforeParsingAndBadJsonAndBadShapeRemainAvailable() throws Exception {
  Group g=setup(true);
  for(String raw:List.of("not JSON","{}",response(g.req())+" {}",response(g.req()).replace("\"processes\":[]","\"processes\":[\"bad\"]"))) {
   when(llm.chatRaw(anyString(),anyString())).thenReturn(new DesignLlmClient.LlmChatResult("test",raw));var result=run(g,UUID.randomUUID().toString());
   assertEquals("PARSE_FAILED",result.get("STATUS"));assertEquals(raw,result.get("RESPONSE_RAW_JSON"));assertNotNull(result.get("COMPLETED_AT"));
  }
 }
 @Test void warnsOnMissingUnknownAndNonStringEvidenceWithoutInventingIt() throws Exception {
  Group g=setup(true);String raw=response("UNKNOWN").replace("\"processes\":[]","\"processes\":[{\"title\":\"missing\"},{\"evidenceRequirementIds\":[12]}]");
  when(llm.chatRaw(anyString(),anyString())).thenReturn(new DesignLlmClient.LlmChatResult("test",raw));var result=run(g,"bad-evidence");
  assertEquals("SUCCEEDED",result.get("STATUS"));assertEquals(3,((List<?>)result.get("WARNINGS")).size());assertEquals(raw,result.get("RESPONSE_RAW_JSON"));
 }
 @Test void callFailureIsDurableSanitizedAndNotAutomaticallyRetried() throws Exception {
  Group g=setup(true);when(llm.chatRaw(anyString(),anyString())).thenThrow(new RuntimeException("secret provider body"));
  var result=run(g,"failure");assertEquals("CALL_FAILED",result.get("STATUS"));assertNull(result.get("RESPONSE_RAW_JSON"));assertFalse(result.get("ERROR_MESSAGE").toString().contains("secret"));
  run(g,"failure");verify(llm,times(1)).chatRaw(anyString(),anyString());
 }
 @Test void typedCallFailurePreservesSafeHttpDiagnosticAndPreviousRuns() throws Exception {
  Group g=setup(true);
  when(llm.chatRaw(anyString(),anyString())).thenThrow(new com.caron.basekit.standarddesign.llm.LlmConnectionException(com.caron.basekit.standarddesign.llm.LlmConnectionException.Failure.HTTP,429,"secret provider body"));
  var failed=run(g,"http-failure");assertEquals("CALL_FAILED",failed.get("STATUS"));assertTrue(failed.get("ERROR_MESSAGE").toString().contains("HTTP 429"));assertFalse(failed.get("ERROR_MESSAGE").toString().contains("secret"));
  doReturn(new DesignLlmClient.LlmChatResult("test",response(g.req()))).when(llm).chatRaw(anyString(),anyString());
  assertEquals("SUCCEEDED",run(g,"new-attempt").get("STATUS"));assertEquals("CALL_FAILED",service.get(g.id(),failed.get("ANALYSIS_ID").toString()).get("STATUS"));
 }
 @Test void savesWholeHttpBodyBeforeParsingEvenForInvalidEnvelopeAndHttpError() throws Exception {
  Group g=setup(true);
  String raw;
  // Build a provider envelope without relying on typed response conversion.
  var envelope=json.createObjectNode();envelope.putArray("choices").addObject().putObject("message").put("content",response(g.req()));raw=" \n"+envelope.toString()+"\n ";
  doReturn(new DesignLlmClient.LlmChatResult("test",raw)).when(llm).chatRaw(anyString(),anyString());
  var ok=run(g,"raw-envelope");assertEquals("SUCCEEDED",ok.get("STATUS"));assertEquals(raw,ok.get("RESPONSE_RAW_JSON"));
  for(String invalid:List.of("not json","{\"choices\":[]}")) {
   doReturn(new DesignLlmClient.LlmChatResult("test",invalid)).when(llm).chatRaw(anyString(),anyString());
   var failed=run(g,UUID.randomUUID().toString());assertEquals("PARSE_FAILED",failed.get("STATUS"));assertEquals(invalid,failed.get("RESPONSE_RAW_JSON"));
  }
  doReturn(new DesignLlmClient.LlmChatResult("test","provider error body",429)).when(llm).chatRaw(anyString(),anyString());
  var denied=run(g,"http-raw");assertEquals("CALL_FAILED",denied.get("STATUS"));assertEquals("provider error body",denied.get("RESPONSE_RAW_JSON"));assertTrue(denied.get("ERROR_MESSAGE").toString().contains("429"));
 }
 @Test void rejectsLegacySnapshotAndStaleVersionButExplicitReconfirmationCreatesCurrentSnapshot() throws Exception {
  Group g=setup(false);
  mvc.perform(post("/api/standard-design/requirement-groups/"+g.id()+"/analyses").contentType(MediaType.APPLICATION_JSON).content(json.createObjectNode().put("VERSION",g.version()).put("REQUEST_ID","legacy").toString())).andExpect(status().isConflict());
  var confirmed=postJson("/api/standard-design/requirement-groups/"+g.id()+"/confirm",json.createObjectNode().put("VERSION",g.version()).put("PROJECT_NAME","현재 프로젝트"));
  assertTrue(confirmed.path("HAS_ANALYSIS_SNAPSHOT").asBoolean());assertEquals(g.version()+1,confirmed.path("VERSION").asLong());
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->run(g,"stale"));verifyNoInteractions(llm);
 }
 @Test void immutableInputSurvivesRequirementChangeDuringCallAndRunningBlocksAnotherRequest() throws Exception {
  Group g=setup(true);var started=new CountDownLatch(1);var proceed=new CountDownLatch(1);
  when(llm.chatRaw(anyString(),anyString())).thenAnswer(invocation->{
   String input=invocation.getArgument(1);assertEquals(input,jdbc.queryForObject("SELECT REQUEST_JSON FROM BSDRGANL WHERE REQUIREMENT_GROUP_ID=?",String.class,g.id()));
   started.countDown();assertTrue(proceed.await(10,TimeUnit.SECONDS));return new DesignLlmClient.LlmChatResult("test",response(g.req()));
  });
  try(var executor=Executors.newSingleThreadExecutor()) {
   var future=executor.submit(()->run(g,"first"));assertTrue(started.await(10,TimeUnit.SECONDS));
   try {
    assertEquals("RUNNING",run(g,"first").get("STATUS"));assertThrows(org.springframework.web.server.ResponseStatusException.class,()->run(g,"different"));
    mvc.perform(delete("/api/standard-design/requirements/"+g.req())).andExpect(status().isNoContent());
   } finally {proceed.countDown();}
   var result=future.get(10,TimeUnit.SECONDS);assertEquals("SUCCEEDED",result.get("STATUS"));
   assertEquals("N",json.readTree((String)result.get("REQUEST_JSON")).path("requirements").get(0).path("discardedYn").asText());
   assertEquals(1,json.readTree((String)result.get("REQUEST_JSON")).path("requirements").get(0).path("revision").asLong());verify(llm,times(1)).chatRaw(anyString(),anyString());
  }
 }
}


