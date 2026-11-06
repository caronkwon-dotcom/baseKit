package com.caron.basekit.standarddesign.screendesign;

import com.caron.basekit.standarddesign.llm.DesignLlmClient;
import com.caron.basekit.standarddesign.llm.LlmConnectionException;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:sd-screen-design;MODE=PostgreSQL;DATABASE_TO_UPPER=TRUE;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc @ActiveProfiles("test")
class ScreenDesignIntegrationTest {
 @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired JdbcTemplate jdbc;
 @MockitoBean DesignLlmClient llm;

 JsonNode call(MockHttpServletRequestBuilder request, int expected) throws Exception {
  var matcher = expected == 200 ? status().is2xxSuccessful() : status().is(expected);
  return json.readTree(mvc.perform(request).andExpect(matcher).andReturn().getResponse().getContentAsString());
 }
 JsonNode putJson(String path, JsonNode body, int expected) throws Exception { return call(put(path).contentType(MediaType.APPLICATION_JSON).content(body.toString()), expected); }
 JsonNode postJson(String path, JsonNode body, int expected) throws Exception { return call(post(path).contentType(MediaType.APPLICATION_JSON).content(body.toString()), expected); }

 String project() { return "SDP-" + UUID.randomUUID(); }
 String program(String project) throws Exception {
  var created = postJson("/api/standard-design/projects/" + project + "/programs", json.createObjectNode().put("PROGRAM_NAME", "구매요청 관리").put("DESCRIPTION", "구매요청을 등록한다."), 200);
  return created.path("DATA").path("PROGRAM_ID").asText();
 }
 String url(String project, String program) { return "/api/standard-design/projects/" + project + "/programs/" + program + "/screen-design"; }

 ObjectNode design() {
  var d = json.createObjectNode().put("SCREEN_TYPE", "GRID_DETAIL");
  d.putArray("SEARCH_FIELDS").addObject().put("FIELD_ID", "S1").put("LABEL", "요청번호").put("CONTROL_TYPE", "TEXT").put("REQUIRED_YN", "N").put("SOURCE", "USER");
  d.putArray("GRID_COLUMNS").addObject().put("FIELD_ID", "G1").put("LABEL", "요청번호").put("DATA_TYPE", "TEXT").put("WIDTH", 120).put("ALIGN", "LEFT").put("SOURCE", "USER");
  d.putArray("DETAIL_FIELDS").addObject().put("FIELD_ID", "D1").put("LABEL", "요청일").put("CONTROL_TYPE", "DATE").put("REQUIRED_YN", "Y").put("SOURCE", "USER");
  d.putArray("ACTION_CODES").add("SEARCH").add("SAVE");
  return d;
 }

 @Test void aProgramWithoutDesignHasNoneAndSaveConfirmFollowTheVersion() throws Exception {
  String project = project(), program = program(project);
  assertTrue(call(get(url(project, program)), 200).path("DATA").isNull());
  assertEquals(0, call(get("/api/standard-design/projects/" + project + "/screen-designs"), 200).path("DATA").size());

  var saved = putJson(url(project, program), design(), 200).path("DATA");
  assertEquals("DRAFT", saved.path("DESIGN_STATUS").asText());
  assertEquals(1, saved.path("VERSION").asLong());
  assertEquals("S1", saved.path("DESIGN").path("SEARCH_FIELDS").path(0).path("FIELD_ID").asText());

  var second = design().put("VERSION", 1);
  assertEquals(2, putJson(url(project, program), second, 200).path("DATA").path("VERSION").asLong());
  putJson(url(project, program), second, 409);                      // stale version

  var confirmed = postJson(url(project, program) + "/confirm", json.createObjectNode().put("VERSION", 2), 200).path("DATA");
  assertEquals("CONFIRMED", confirmed.path("DESIGN_STATUS").asText());
  assertEquals(3, confirmed.path("VERSION").asLong());
  postJson(url(project, program) + "/confirm", json.createObjectNode().put("VERSION", 3), 409);   // already confirmed

  var edited = design().put("VERSION", 3);                       // editing a confirmed design returns it to DRAFT
  var draft = putJson(url(project, program), edited, 200).path("DATA");
  assertEquals("DRAFT", draft.path("DESIGN_STATUS").asText());
  assertEquals(4, draft.path("VERSION").asLong());

  var list = call(get("/api/standard-design/projects/" + project + "/screen-designs"), 200).path("DATA");
  assertEquals(1, list.size());
  assertEquals(program, list.get(0).path("PROGRAM_ID").asText());
 }

 @Test void firstSaveNeedsNoVersionAndLaterSavesDo() throws Exception {
  String project = project(), program = program(project);
  putJson(url(project, program), design().put("VERSION", 5), 409);   // nothing saved yet
  putJson(url(project, program), design(), 200);
  putJson(url(project, program), design(), 422);                      // existing design without VERSION
  postJson(url(project, program) + "/confirm", json.createObjectNode(), 422);
 }

 @Test void theServerRejectsWhatTheScreenShouldNeverSend() throws Exception {
  String project = project(), program = program(project);
  var badType = design().put("SCREEN_TYPE", "NOPE");
  assertTrue(putJson(url(project, program), badType, 422).path("MESSAGE").asText().contains("SCREEN_TYPE"));
  var duplicate = design(); ((com.fasterxml.jackson.databind.node.ArrayNode) duplicate.path("SEARCH_FIELDS")).addObject().put("FIELD_ID", "S1").put("LABEL", "x").put("CONTROL_TYPE", "TEXT").put("REQUIRED_YN", "N").put("SOURCE", "USER");
  assertTrue(putJson(url(project, program), duplicate, 422).path("MESSAGE").asText().contains("중복"));
  var action = design(); ((com.fasterxml.jackson.databind.node.ArrayNode) action.path("ACTION_CODES")).add("DROP_TABLE");
  assertTrue(putJson(url(project, program), action, 422).path("MESSAGE").asText().contains("ACTION_CODES"));
  var noId = design(); ((ObjectNode) noId.path("GRID_COLUMNS").get(0)).remove("FIELD_ID");
  assertTrue(putJson(url(project, program), noId, 422).path("MESSAGE").asText().contains("FIELD_ID"));
  var width = design(); ((ObjectNode) width.path("GRID_COLUMNS").get(0)).put("WIDTH", 5);
  assertTrue(putJson(url(project, program), width, 422).path("MESSAGE").asText().contains("WIDTH"));
  assertTrue(call(get(url(project, program)), 200).path("DATA").isNull());   // nothing was stored
 }

 @Test void theProgramMustBelongToTheProject() throws Exception {
  String project = project(), program = program(project);
  call(get(url(project(), program)), 404);
  call(get(url(project, "SDPG-unknown")), 404);
 }

 @Test void aiDraftIsValidatedMarkedAsAiAndNeverSaved() throws Exception {
  String project = project(), program = program(project);
  when(llm.chatRaw(anyString(), anyString(), any())).thenReturn(new DesignLlmClient.LlmChatResult("m",
   "```json\n{\"SCREEN_TYPE\":\"GRID_DETAIL\",\"SEARCH_FIELDS\":[{\"LABEL\":\"요청번호\",\"CONTROL_TYPE\":\"TEXT\"}],\"GRID_COLUMNS\":[{\"LABEL\":\"금액\",\"DATA_TYPE\":\"NUMBER\"}],\"DETAIL_FIELDS\":[{\"LABEL\":\"비고\",\"CONTROL_TYPE\":\"TEXT\",\"SOURCE\":\"USER\"}],\"ACTION_CODES\":[\"SEARCH\"]}\n```"));
  var data = postJson(url(project, program) + "/ai-draft", json.createObjectNode(), 200).path("DATA");
  var design = data.path("DESIGN");
  assertEquals("AI", design.path("SEARCH_FIELDS").path(0).path("SOURCE").asText());
  assertEquals("AI", design.path("DETAIL_FIELDS").path(0).path("SOURCE").asText());   // the model cannot claim USER
  assertFalse(design.path("SEARCH_FIELDS").path(0).path("FIELD_ID").asText().isBlank());
  assertEquals("RIGHT", design.path("GRID_COLUMNS").path(0).path("ALIGN").asText());
  assertEquals(120, design.path("GRID_COLUMNS").path(0).path("WIDTH").asInt());
  assertEquals(0, data.path("EVIDENCE_COUNT").asInt());
  assertTrue(call(get(url(project, program)), 200).path("DATA").isNull());
 }

 @Test void aBadAiAnswerKeepsWhatWasSavedAndReportsWhy() throws Exception {
  String project = project(), program = program(project);
  putJson(url(project, program), design(), 200);
  when(llm.chatRaw(anyString(), anyString(), any())).thenReturn(new DesignLlmClient.LlmChatResult("m", "{\"SCREEN_TYPE\":\"WHATEVER\"}"));
  assertTrue(postJson(url(project, program) + "/ai-draft", json.createObjectNode(), 422).path("MESSAGE").asText().contains("SCREEN_TYPE"));
  when(llm.chatRaw(anyString(), anyString(), any())).thenReturn(new DesignLlmClient.LlmChatResult("m", "죄송합니다 JSON이 아닙니다"));
  assertTrue(postJson(url(project, program) + "/ai-draft", json.createObjectNode(), 422).path("MESSAGE").asText().contains("해석하지 못했습니다"));
  when(llm.chatRaw(anyString(), anyString(), any())).thenReturn(new DesignLlmClient.LlmChatResult("m", "{\"choices\":[{\"finish_reason\":\"length\",\"message\":{\"content\":\"{\"}}]}"));
  assertTrue(postJson(url(project, program) + "/ai-draft", json.createObjectNode(), 422).path("MESSAGE").asText().contains("출력 한도"));
  when(llm.chatRaw(anyString(), anyString(), any())).thenReturn(new DesignLlmClient.LlmChatResult("m", "denied", 403));
  postJson(url(project, program) + "/ai-draft", json.createObjectNode(), 502);
  when(llm.chatRaw(anyString(), anyString(), any())).thenThrow(new LlmConnectionException("down"));
  postJson(url(project, program) + "/ai-draft", json.createObjectNode(), 503);
  assertEquals("S1", call(get(url(project, program)), 200).path("DATA").path("DESIGN").path("SEARCH_FIELDS").path(0).path("FIELD_ID").asText());
 }

 @Test void theAiPromptCarriesEvidenceButTheDatabaseKeepsNoPrompt() throws Exception {
  String project = project(), program = program(project);
  jdbc.update("INSERT INTO BSDGPREQ(PROGRAM_ID, REQUIREMENT_ID, REQUIREMENT_REVISION, SNAPSHOT_JSON) VALUES(?,?,?,?)", program, "REQ-1", 1, "{\"name\":\"구매요청 등록\",\"description\":\"부서가 요청한다\",\"processDescription\":\"요청→승인\"}");
  var captured = new String[1];
  when(llm.chatRaw(anyString(), anyString(), any())).thenAnswer(invocation -> { captured[0] = invocation.getArgument(1); return new DesignLlmClient.LlmChatResult("m", "{\"SCREEN_TYPE\":\"GRID_ONLY\"}"); });
  var data = postJson(url(project, program) + "/ai-draft", json.createObjectNode(), 200).path("DATA");
  assertTrue(captured[0].contains("구매요청 등록") && captured[0].contains("REQ-1") && captured[0].contains("요청→승인"));
  assertEquals(1, data.path("EVIDENCE_COUNT").asInt());
  assertEquals(0, data.path("DESIGN").path("GRID_COLUMNS").size());
  assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM BSDSCRN WHERE PROGRAM_ID = ?", Integer.class, program));
 }
}
