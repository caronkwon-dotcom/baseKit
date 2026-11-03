package com.caron.basekit.standarddesign.program;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import java.util.*;

/** Read-only view of a project's program register for AI comparison; it never writes. */
@Component
public class ProgramLedgerReader {
 public record Entry(String programId, String name, String description, String kind, long version, String sourceGroupId,
   List<String> requirementIds, List<String> requirementNames) { }
 private final JdbcTemplate jdbc;
 private final ObjectMapper json;
 public ProgramLedgerReader(JdbcTemplate jdbc, ObjectMapper json) { this.jdbc = jdbc; this.json = json; }

 private static Map<String, Object> upper(Map<String, Object> row) {
  var result = new LinkedHashMap<String, Object>();
  row.forEach((key, value) -> result.put(key.toUpperCase(Locale.ROOT), value));
  return result;
 }

 /** Project owning the program, or empty when the ID does not exist anywhere. */
 public Optional<String> projectOf(String programId) {
  if (programId == null || programId.isBlank()) return Optional.empty();
  var rows = jdbc.queryForList("SELECT PROJECT_ID FROM BSDGPROG WHERE PROGRAM_ID=?", String.class, programId);
  return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
 }

 /** Every program of the project in registration order, with requirement links and the AI-assigned type when known. */
 public List<Entry> read(String project) {
  var evidence = new HashMap<String, List<String[]>>();
  for (var row : jdbc.queryForList("SELECT R.PROGRAM_ID,R.REQUIREMENT_ID,R.SNAPSHOT_JSON FROM BSDGPREQ R WHERE R.PROGRAM_ID IN (SELECT PROGRAM_ID FROM BSDGPROG WHERE PROJECT_ID=?) ORDER BY R.PROGRAM_ID,R.REQUIREMENT_ID", project)) {
   var fields = upper(row);
   evidence.computeIfAbsent((String) fields.get("PROGRAM_ID"), key -> new ArrayList<>()).add(new String[] { (String) fields.get("REQUIREMENT_ID"), nameOf((String) fields.get("SNAPSHOT_JSON")) });
  }
  var responses = new HashMap<String, JsonNode>();
  var entries = new ArrayList<Entry>();
  for (var row : jdbc.queryForList("SELECT PROGRAM_ID,PROGRAM_NAME,PURPOSE,SOURCE_GROUP_ID,SOURCE_ANALYSIS_ID,SOURCE_CANDIDATE_INDEX,VERSION FROM BSDGPROG WHERE PROJECT_ID=? ORDER BY CREATED_AT,PROGRAM_ID", project)) {
   var fields = upper(row);
   String id = (String) fields.get("PROGRAM_ID");
   var links = evidence.getOrDefault(id, List.of());
   entries.add(new Entry(id, (String) fields.get("PROGRAM_NAME"), Objects.toString(fields.get("PURPOSE"), ""), kindOf(fields, responses),
    fields.get("VERSION") instanceof Number number ? number.longValue() : 1L, (String) fields.get("SOURCE_GROUP_ID"),
    links.stream().map(link -> link[0]).toList(), links.stream().map(link -> link[1]).filter(name -> !name.isBlank()).toList()));
  }
  return entries;
 }

 private String nameOf(String snapshot) {
  try { return json.readTree(snapshot == null ? "{}" : snapshot).path("name").asText(""); } catch (Exception e) { return ""; }
 }

 /** The type lives in the immutable source analysis candidate; manual programs and older analyses have none. */
 private String kindOf(Map<String, Object> fields, Map<String, JsonNode> cache) {
  Object analysis = fields.get("SOURCE_ANALYSIS_ID"), index = fields.get("SOURCE_CANDIDATE_INDEX");
  if (analysis == null || !(index instanceof Number number)) return null;
  try {
   var response = cache.computeIfAbsent((String) analysis, key -> {
    var rows = jdbc.queryForList("SELECT RESPONSE_VALIDATED_JSON FROM BSDRGANL WHERE ANALYSIS_ID=?", String.class, key);
    try { return rows.isEmpty() || rows.getFirst() == null ? json.nullNode() : json.readTree(rows.getFirst()); } catch (Exception e) { return json.nullNode(); }
   });
   String kind = response.path("programCandidates").path(number.intValue()).path("type").asText("");
   return com.caron.basekit.standarddesign.requirementgroup.RequirementGroupAnalysisService.PROGRAM_KINDS.contains(kind) ? kind : null;
  } catch (RuntimeException e) { return null; }
 }
}
