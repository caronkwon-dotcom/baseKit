package com.caron.basekit.standarddesign.requirement;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:sd-trace;MODE=PostgreSQL;DATABASE_TO_UPPER=TRUE;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc @ActiveProfiles("test") @Transactional  // every test rolls back, so the fixed IDs below never collide
class RequirementTraceIntegrationTest {
 @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired JdbcTemplate jdbc;

 String project = "SDP-" + UUID.randomUUID();

 void requirement(String project, String id, int revision) {
  jdbc.update("INSERT INTO BSDRREQ(REQUIREMENT_ID, PROJECT_ID, REQUIREMENT_NAME, REQUIREMENT_TYPE_CODE, STATUS, REQUIREMENT_REVISION) VALUES(?,?,?,?,?,?)", id, project, "요구 " + id, "NEW", "DRAFT", revision);
 }
 void group(String project, String group, String status, String... requirements) {
  jdbc.update("INSERT INTO BSDRGRP(REQUIREMENT_GROUP_ID, PROJECT_ID, REQUIREMENT_GROUP_NAME, DESCRIPTION, GROUP_STATUS, VERSION, REQUEST_ID, REQUEST_PAYLOAD) VALUES(?,?,?,?,?,1,?,'{}')", group, project, "그룹 " + group, "", status, "r-" + group);
  for (String requirement : requirements) jdbc.update("INSERT INTO BSDRGRQ(REQUIREMENT_GROUP_ID, PROJECT_ID, REQUIREMENT_ID, HUMAN_YN, INCLUSION_REASON, REVIEWED_REVISION, REVIEWED_SNAPSHOT) VALUES(?,?,?,'N','',1,'{}')", group, project, requirement);
 }
 void program(String project, String program, String group) {
  jdbc.update("INSERT INTO BSDGPROG(PROGRAM_ID, PROJECT_ID, PROGRAM_NAME, PURPOSE, STATUS, SOURCE_GROUP_ID, SOURCE_ANALYSIS_ID, SOURCE_RESULT_VERSION) VALUES(?,?,?,?,'DRAFT',?,?,1)", program, project, "프로그램 " + program, "목적", group, group == null ? null : "AN-1");
 }
 void evidence(String program, String requirement, Integer snapshotRevision) {
  jdbc.update("INSERT INTO BSDGPREQ(PROGRAM_ID, REQUIREMENT_ID, REQUIREMENT_REVISION, SNAPSHOT_JSON) VALUES(?,?,?,'{}')", program, requirement, snapshotRevision);
 }
 void design(String project, String program, String status, String designJson) {
  jdbc.update("INSERT INTO BSDSCRN(SCREEN_DESIGN_ID, PROJECT_ID, PROGRAM_ID, DESIGN_STATUS, SCREEN_TYPE, DESIGN_JSON) VALUES(?,?,?,?,'GRID_DETAIL',?)", "SDSC-" + UUID.randomUUID(), project, program, status, designJson);
 }
 String functions(String... pairs) {
  var specs = new StringBuilder();
  for (int i = 0; i < pairs.length; i += 2) { if (i > 0) specs.append(','); specs.append("{\"FUNCTION_ID\":\"").append(pairs[i]).append("\",\"NAME\":\"기능 ").append(pairs[i]).append("\",\"REQUIREMENT_IDS\":[").append(pairs[i + 1]).append("]}"); }
  return "{\"SCREEN_TYPE\":\"GRID_DETAIL\",\"FUNCTION_SPECS\":[" + specs + "]}";
 }
 JsonNode call(String url, int expected) throws Exception {
  return json.readTree(mvc.perform(get(url)).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString());
 }
 JsonNode summaryOf(JsonNode summary, String id) {
  for (JsonNode row : summary.path("DATA")) if (id.equals(row.path("REQUIREMENT_ID").asText())) return row;
  fail("requirement missing from summary: " + id); return null;
 }
 String base() { return "/api/standard-design/requirements"; }

 /** One project with every state and the borders between them. */
 void fixture() {
  for (String id : new String[] {"U", "G", "P", "D", "X", "Y", "M"}) requirement(project, id, 1);
  group(project, "GRP-1", "CONFIRMED", "G", "P", "D", "M");               // G, P, D, M belong to a group
  program(project, "PG-A", "GRP-1"); program(project, "PG-B", "GRP-1");    // a group with several programs
  evidence("PG-A", "P", 1); evidence("PG-A", "M", 1);                      // P has a program but no design; M is in two programs
  evidence("PG-B", "D", 1); evidence("PG-B", "M", 1);                      // a program with several requirements
  design(project, "PG-B", "CONFIRMED", functions("FN-01", "\"D\",\"M\"", "FN-02", "\"M\""));
  program(project, "PG-C", null); evidence("PG-C", "X", 1);                // X only in a DRAFT design
  design(project, "PG-C", "DRAFT", functions("FN-01", "\"X\""));
  program(project, "PG-D", null); evidence("PG-D", "Y", 1);                // Y: confirmed design that names another requirement
  design(project, "PG-D", "CONFIRMED", functions("FN-01", "\"OTHER\""));
 }

 @Test void everyStateIsComputedForTheWholeProjectInOneCall() throws Exception {
  fixture();
  var summary = call(base() + "/trace-summary?PROJECT_ID=" + project, 200);
  assertEquals(7, summary.path("DATA").size());
  assertEquals("UNLINKED", summaryOf(summary, "U").path("TRACE_STATE").asText());
  assertEquals("GROUP_ONLY", summaryOf(summary, "G").path("TRACE_STATE").asText());
  assertEquals("PROGRAM", summaryOf(summary, "P").path("TRACE_STATE").asText());
  assertEquals("DESIGN_REFLECTED", summaryOf(summary, "D").path("TRACE_STATE").asText());
  assertEquals("PROGRAM", summaryOf(summary, "X").path("TRACE_STATE").asText(), "a draft design is not reflected");
  assertEquals("PROGRAM", summaryOf(summary, "Y").path("TRACE_STATE").asText(), "a confirmed design that does not name it is not reflected");
  var m = summaryOf(summary, "M");
  assertEquals("DESIGN_REFLECTED", m.path("TRACE_STATE").asText());
  assertEquals(2, m.path("PROGRAM_COUNT").asInt());
  assertEquals(1, m.path("GROUP_COUNT").asInt());
  assertEquals(0, summaryOf(summary, "U").path("GROUP_COUNT").asInt());
 }

 @Test void theDetailShowsGroupsProgramsDesignAndTheFunctionsThatNameTheRequirement() throws Exception {
  fixture();
  var trace = call(base() + "/M/trace?PROJECT_ID=" + project, 200).path("DATA");
  assertEquals("DESIGN_REFLECTED", trace.path("TRACE_STATE").asText());
  assertEquals("GRP-1", trace.path("GROUPS").get(0).path("REQUIREMENT_GROUP_ID").asText());
  assertEquals("CONFIRMED", trace.path("GROUPS").get(0).path("GROUP_STATUS").asText());
  assertEquals(2, trace.path("PROGRAMS").size());
  var a = trace.path("PROGRAMS").get(0); var b = trace.path("PROGRAMS").get(1);
  assertEquals("PG-A", a.path("PROGRAM_ID").asText());
  assertTrue(a.path("DESIGN").isNull());
  assertEquals("N", a.path("REFLECTED_YN").asText());
  assertEquals("PG-B", b.path("PROGRAM_ID").asText());
  assertEquals("Y", b.path("REFLECTED_YN").asText());
  assertEquals("CONFIRMED", b.path("DESIGN").path("DESIGN_STATUS").asText());
  assertEquals(2, b.path("DESIGN").path("FUNCTIONS").size());
  assertEquals("FN-01", b.path("DESIGN").path("FUNCTIONS").get(0).path("FUNCTION_ID").asText());
  var d = call(base() + "/D/trace?PROJECT_ID=" + project, 200).path("DATA");
  assertEquals(1, d.path("PROGRAMS").get(0).path("DESIGN").path("FUNCTIONS").size(), "only the functions naming this requirement");
  var x = call(base() + "/X/trace?PROJECT_ID=" + project, 200).path("DATA");
  assertEquals("DRAFT", x.path("PROGRAMS").get(0).path("DESIGN").path("DESIGN_STATUS").asText());
  assertEquals("N", x.path("PROGRAMS").get(0).path("REFLECTED_YN").asText());
  var u = call(base() + "/U/trace?PROJECT_ID=" + project, 200).path("DATA");
  assertEquals(0, u.path("GROUPS").size()); assertEquals(0, u.path("PROGRAMS").size());
 }

 @Test void aRequirementOfAnotherProjectIsNotFoundAndTheProjectIsRequired() throws Exception {
  fixture();
  assertTrue(call(base() + "/D/trace?PROJECT_ID=SDP-OTHER", 404).path("MESSAGE").asText().contains("찾을 수 없습니다"));
  call(base() + "/NOPE/trace?PROJECT_ID=" + project, 404);
  call(base() + "/D/trace", 422);
  call(base() + "/trace-summary", 422);
  assertEquals(0, call(base() + "/trace-summary?PROJECT_ID=SDP-OTHER", 200).path("DATA").size());
 }

 @Test void aNewerRequirementRevisionFlagsTheProgramAndItsDesignUntilTheProgramIsAdoptedAgain() throws Exception {
  String p = "SDP-" + UUID.randomUUID();
  requirement(p, "S", 3); requirement(p, "N", 3); requirement(p, "OLD", 5);
  program(p, "PG-S", null); evidence("PG-S", "S", 2); evidence("PG-S", "N", 3);   // S changed since adoption, N did not
  program(p, "PG-OLD", null); evidence("PG-OLD", "OLD", null);                    // older data: no recorded revision
  design(p, "PG-S", "DRAFT", functions("FN-01", "\"S\""));
  design(p, "PG-OLD", "DRAFT", functions());

  var s = call(base() + "/S/trace?PROJECT_ID=" + p, 200).path("DATA");
  assertEquals("Y", s.path("REVIEW_REQUIRED_YN").asText());
  assertEquals(2, s.path("PROGRAMS").get(0).path("SNAPSHOT_REVISION").asInt());
  assertEquals("N", call(base() + "/N/trace?PROJECT_ID=" + p, 200).path("DATA").path("REVIEW_REQUIRED_YN").asText());
  assertEquals("N", call(base() + "/OLD/trace?PROJECT_ID=" + p, 200).path("DATA").path("REVIEW_REQUIRED_YN").asText(), "no recorded revision cannot be judged");
  assertTrue(call(base() + "/OLD/trace?PROJECT_ID=" + p, 200).path("DATA").path("PROGRAMS").get(0).path("SNAPSHOT_REVISION").isNull());
  assertEquals("Y", summaryOf(call(base() + "/trace-summary?PROJECT_ID=" + p, 200), "S").path("REVIEW_REQUIRED_YN").asText());

  var programs = call("/api/standard-design/projects/" + p + "/programs", 200).path("DATA");
  for (JsonNode program : programs) {
    boolean flagged = "PG-S".equals(program.path("PROGRAM_ID").asText());
    assertEquals(flagged ? "Y" : "N", program.path("REVIEW_REQUIRED_YN").asText(), program.path("PROGRAM_ID").asText());
    assertEquals(flagged ? 1 : 0, program.path("STALE_REQUIREMENT_IDS").size());
  }
  var designs = call("/api/standard-design/projects/" + p + "/screen-designs", 200).path("DATA");
  for (JsonNode design : designs) assertEquals("PG-S".equals(design.path("PROGRAM_ID").asText()) ? "Y" : "N", design.path("REVIEW_REQUIRED_YN").asText());

  jdbc.update("UPDATE BSDRREQ SET REQUIREMENT_REVISION = 4 WHERE REQUIREMENT_ID = 'N'");        // N changes too
  assertEquals("Y", call(base() + "/N/trace?PROJECT_ID=" + p, 200).path("DATA").path("REVIEW_REQUIRED_YN").asText());
  jdbc.update("UPDATE BSDGPREQ SET REQUIREMENT_REVISION = 3 WHERE PROGRAM_ID = 'PG-S' AND REQUIREMENT_ID = 'S'");   // adopted again with the new revision
  assertEquals("N", call(base() + "/S/trace?PROJECT_ID=" + p, 200).path("DATA").path("REVIEW_REQUIRED_YN").asText());
  assertEquals("Y", summaryOf(call(base() + "/trace-summary?PROJECT_ID=" + p, 200), "N").path("REVIEW_REQUIRED_YN").asText());
  var single = call("/api/standard-design/projects/" + p + "/programs", 200).path("DATA");
  for (JsonNode program : single) if ("PG-S".equals(program.path("PROGRAM_ID").asText())) assertEquals("Y", program.path("REVIEW_REQUIRED_YN").asText(), "N is now newer than its snapshot");
 }

 @Test void anUnreadableDesignDoesNotBreakTheTrace() throws Exception {
  String p = "SDP-" + UUID.randomUUID();
  requirement(p, "R", 1); program(p, "PG-1", null); evidence("PG-1", "R", 1);
  design(p, "PG-1", "CONFIRMED", "not json at all");
  assertEquals("PROGRAM", call(base() + "/R/trace?PROJECT_ID=" + p, 200).path("DATA").path("TRACE_STATE").asText());
  assertEquals("PROGRAM", summaryOf(call(base() + "/trace-summary?PROJECT_ID=" + p, 200), "R").path("TRACE_STATE").asText());
 }

 @Test void aThousandRequirementsAreSummarisedWithoutOneCallEach() throws Exception {
  String p = "SDP-" + UUID.randomUUID();
  for (int i = 0; i < 1000; i++) requirement(p, "R" + i, 1);
  program(p, "PG-1", null);
  for (int i = 0; i < 400; i++) evidence("PG-1", "R" + i, 1);
  design(p, "PG-1", "CONFIRMED", functions("FN-01", "\"R0\""));
  long began = System.nanoTime();
  var summary = call(base() + "/trace-summary?PROJECT_ID=" + p, 200);
  long millis = (System.nanoTime() - began) / 1_000_000;
  assertEquals(1000, summary.path("DATA").size());
  assertEquals("DESIGN_REFLECTED", summaryOf(summary, "R0").path("TRACE_STATE").asText());
  assertEquals("PROGRAM", summaryOf(summary, "R399").path("TRACE_STATE").asText());
  assertEquals("UNLINKED", summaryOf(summary, "R999").path("TRACE_STATE").asText());
  System.out.println("trace-summary for 1000 requirements: " + millis + " ms");
  assertTrue(millis < 5000, "took " + millis + " ms");
 }
}
