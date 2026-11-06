package com.caron.basekit.standarddesign.project;

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
import org.springframework.test.web.servlet.MockMvc;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:sd-project;MODE=PostgreSQL;DATABASE_TO_UPPER=TRUE;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc @ActiveProfiles("test")
class ProjectIntegrationTest {
 @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired JdbcTemplate jdbc;
 static final String BASE = "/api/standard-design/projects";

 ObjectNode input(String name) {
  return json.createObjectNode().put("PROJECT_NAME", name).put("CUSTOMER_NAME", "고객").put("DESCRIPTION", "설명").put("STATUS", "IN_PROGRESS").put("START_DATE", "2026-11-01").put("END_DATE", "2027-03-31");
 }
 JsonNode send(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request, int status) throws Exception {
  // 200 stands for "succeeded": other endpoints answer 201 for created resources.
  var matcher = status == 200 ? status().is2xxSuccessful() : status().is(status);
  return json.readTree(mvc.perform(request).andExpect(matcher).andReturn().getResponse().getContentAsString());
 }
 JsonNode postJson(String path, JsonNode body, int status) throws Exception { return send(post(path).contentType(MediaType.APPLICATION_JSON).content(body.toString()), status); }
 JsonNode putJson(String path, JsonNode body, int status) throws Exception { return send(put(path).contentType(MediaType.APPLICATION_JSON).content(body.toString()), status); }
 JsonNode create(String name) throws Exception { return postJson(BASE, input(name), 200).path("DATA"); }

 @Test void projectsAreRegisteredReadUpdatedAndLogicallyDeletedOnTheServer() throws Exception {
  var created = create("서버 프로젝트");
  String id = created.path("PROJECT_ID").asText();
  assertTrue(id.startsWith("SDP-"));
  assertEquals(1, created.path("VERSION").asLong());
  assertEquals("2026-11-01", created.path("START_DATE").asText());
  assertEquals(0, created.path("USAGE").path("REQUIREMENTS").asInt());
  assertTrue(send(get(BASE), 200).path("DATA").toString().contains(id));
  assertEquals("IN_PROGRESS", send(get(BASE + "/" + id), 200).path("DATA").path("STATUS").asText());

  var changed = input("서버 프로젝트 수정").put("VERSION", 1);
  var updated = putJson(BASE + "/" + id, changed, 200).path("DATA");
  assertEquals("서버 프로젝트 수정", updated.path("PROJECT_NAME").asText());
  assertEquals(2, updated.path("VERSION").asLong());
  putJson(BASE + "/" + id, changed, 409);

  mvc.perform(delete(BASE + "/" + id).param("VERSION", "1")).andExpect(status().isConflict());
  mvc.perform(delete(BASE + "/" + id).param("VERSION", "2")).andExpect(status().isOk());
  assertFalse(send(get(BASE), 200).path("DATA").toString().contains(id));
  mvc.perform(get(BASE + "/" + id)).andExpect(status().isNotFound());
  mvc.perform(delete(BASE + "/" + id).param("VERSION", "3")).andExpect(status().isNotFound());
  assertEquals("Y", jdbc.queryForObject("SELECT DEL_YN FROM BSDPROJ WHERE PROJECT_ID=?", String.class, id));
 }

 @Test void theServerValidatesWhatTheScreenUsedToCheckAlone() throws Exception {
  assertEquals("프로젝트명과 고객명은 필수입니다.", postJson(BASE, input(" "), 422).path("MESSAGE").asText());
  assertEquals("프로젝트명과 고객명은 필수입니다.", postJson(BASE, input("이름").put("CUSTOMER_NAME", ""), 422).path("MESSAGE").asText());
  assertEquals("프로젝트 시작일과 종료일은 필수입니다.", postJson(BASE, input("이름").put("START_DATE", ""), 422).path("MESSAGE").asText());
  assertEquals("프로젝트 시작일은 종료일보다 늦을 수 없습니다.", postJson(BASE, input("이름").put("START_DATE", "2027-04-01"), 422).path("MESSAGE").asText());
  assertEquals("날짜는 YYYY-MM-DD 형식으로 입력하세요.", postJson(BASE, input("이름").put("END_DATE", "2027/03/31"), 422).path("MESSAGE").asText());
  assertEquals("프로젝트 상태 값이 올바르지 않습니다.", postJson(BASE, input("이름").put("STATUS", "DONE"), 422).path("MESSAGE").asText());
  assertEquals("프로젝트명과 고객명은 200자 이하로 입력하세요.", postJson(BASE, input("가".repeat(201)), 422).path("MESSAGE").asText());
  var id = create("검증용").path("PROJECT_ID").asText();
  assertEquals("VERSION이 필요합니다.", putJson(BASE + "/" + id, input("검증용"), 422).path("MESSAGE").asText());
  postJson(BASE, json.createObjectNode().put("PROJECT_NAME", "x"), 422);
  mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content("{broken")).andExpect(status().isBadRequest());
  assertEquals("DRAFT", postJson(BASE, input("기본 상태").put("STATUS", ""), 200).path("DATA").path("STATUS").asText());
 }

 @Test void aProjectWithServerDataCannotBeDeleted() throws Exception {
  String id = create("하위 데이터 프로젝트").path("PROJECT_ID").asText();
  var requirement = json.createObjectNode().put("PROJECT_ID", id).put("REQUIREMENT_NAME", "요구사항").put("REQUIREMENT_TYPE_CODE", "NEW")
   .put("DESCRIPTION", "본문").put("PROCESS_DESCRIPTION", "등록 → 승인").put("STATUS", "DRAFT");
  postJson("/api/standard-design/requirements", requirement, 200);
  assertEquals(1, send(get(BASE + "/" + id), 200).path("DATA").path("USAGE").path("REQUIREMENTS").asInt());
  var refused = send(delete(BASE + "/" + id).param("VERSION", "1"), 409);
  assertTrue(refused.path("MESSAGE").asText().contains("요구사항 1건"));
  assertEquals("N", jdbc.queryForObject("SELECT DEL_YN FROM BSDPROJ WHERE PROJECT_ID=?", String.class, id));
 }

 JsonNode confirmedGroup(String project, String clientName) throws Exception {
  var requirement = postJson("/api/standard-design/requirements", json.createObjectNode().put("PROJECT_ID", project).put("REQUIREMENT_NAME", "구매 요구사항").put("REQUIREMENT_TYPE_CODE", "NEW")
   .put("DESCRIPTION", "본문").put("PROCESS_DESCRIPTION", "등록 → 승인").put("STATUS", "DRAFT"), 200).path("DATA");
  var group = json.createObjectNode().put("PROJECT_ID", project).put("REQUIREMENT_GROUP_NAME", "구매 그룹").put("DESCRIPTION", "").put("REQUEST_ID", UUID.randomUUID().toString());
  group.putArray("MEMBERS").addObject().put("REQUIREMENT_ID", requirement.path("REQUIREMENT_ID").asText()).put("HUMAN_YN", "Y").put("INCLUSION_REASON", "")
   .put("REVIEWED_REVISION", requirement.path("REQUIREMENT_REVISION").asLong()).putArray("SOURCE_ANALYSIS_IDS");
  var saved = postJson("/api/standard-design/requirement-groups", group, 200).path("DATA");
  return postJson("/api/standard-design/requirement-groups/" + saved.path("REQUIREMENT_GROUP_ID").asText() + "/confirm",
   json.createObjectNode().put("VERSION", saved.path("VERSION").asLong()).put("PROJECT_NAME", clientName), 200).path("DATA");
 }

 @Test void theSnapshotUsesTheMasterNameRegardlessOfWhatTheBrowserSent() throws Exception {
  String id = create("서버가 아는 이름").path("PROJECT_ID").asText();
  var group = confirmedGroup(id, "브라우저가 보낸 이름");
  String snapshot = jdbc.queryForObject("SELECT REQUEST_JSON FROM BSDRGCTX WHERE REQUIREMENT_GROUP_ID=?", String.class, group.path("REQUIREMENT_GROUP_ID").asText());
  assertTrue(snapshot.contains("서버가 아는 이름"));
  assertFalse(snapshot.contains("브라우저가 보낸 이름"));
 }

 @Test void aProjectNotInTheMasterKeepsTheOldBehaviour() throws Exception {
  String unknown = "NOMASTER-" + UUID.randomUUID().toString().substring(0, 8);
  var group = confirmedGroup(unknown, "요청이 보낸 이름");
  String snapshot = jdbc.queryForObject("SELECT REQUEST_JSON FROM BSDRGCTX WHERE REQUIREMENT_GROUP_ID=?", String.class, group.path("REQUIREMENT_GROUP_ID").asText());
  assertTrue(snapshot.contains("요청이 보낸 이름"));
 }

 @Test void backfillRegistersEveryReferencedProjectOnceAndCanBeRunAgain() throws Exception {
  String legacy = "BF-" + UUID.randomUUID().toString().substring(0, 8);
  postJson("/api/standard-design/requirements", json.createObjectNode().put("PROJECT_ID", legacy).put("REQUIREMENT_NAME", "기존 요구사항").put("REQUIREMENT_TYPE_CODE", "NEW")
   .put("DESCRIPTION", "본문").put("PROCESS_DESCRIPTION", "처리").put("STATUS", "DRAFT"), 200);
  assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM BSDPROJ WHERE PROJECT_ID=?", Integer.class, legacy));
  var lines = Files.readAllLines(Path.of("../database/migration/V27__backfill_sd_project.sql"));
  String sql = String.join("\n", lines.stream().filter(line -> !line.strip().startsWith("--")).toList()).strip();
  sql = sql.endsWith(";") ? sql.substring(0, sql.length() - 1) : sql;
  jdbc.execute(sql);
  jdbc.execute(sql);
  assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM BSDPROJ WHERE PROJECT_ID=?", Integer.class, legacy));
  var row = jdbc.queryForMap("SELECT PROJECT_NAME,STATUS,START_DATE,DEL_YN FROM BSDPROJ WHERE PROJECT_ID=?", legacy);
  assertEquals(legacy, row.get("PROJECT_NAME"));
  assertEquals("DRAFT", row.get("STATUS"));
  assertNull(row.get("START_DATE"));
  assertTrue(send(get(BASE), 200).path("DATA").toString().contains(legacy));
  // A backfilled project stays editable once the required fields are filled in.
  var updated = putJson(BASE + "/" + legacy, input("이름을 채움").put("VERSION", 1), 200).path("DATA");
  assertEquals("이름을 채움", updated.path("PROJECT_NAME").asText());
  assertEquals(1, updated.path("USAGE").path("REQUIREMENTS").asInt());
 }
}
