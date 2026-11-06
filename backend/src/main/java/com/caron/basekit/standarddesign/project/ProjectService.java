package com.caron.basekit.standarddesign.project;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;

/** Standard Design project master (BSDPROJ). The server is the only source of project data. */
@Service
public class ProjectService {
 public static final Set<String> STATUSES = Set.of("DRAFT", "IN_PROGRESS", "REVIEW", "APPROVED");
 private static final String COLUMNS = "PROJECT_ID,PROJECT_NAME,CUSTOMER_NAME,DESCRIPTION,STATUS,START_DATE,END_DATE,VERSION,REG_DT,MOD_DT";
 /** Server tables that reference a project by ID; a project with rows in any of them cannot be deleted. */
 private static final Map<String, String> USAGE = new LinkedHashMap<>();
 static {
  USAGE.put("REQUIREMENTS", "BSDRREQ");
  USAGE.put("REQUIREMENT_GROUPS", "BSDRGRP");
  USAGE.put("GROUPING_ANALYSES", "BSDPGANL");
  USAGE.put("PROGRAMS", "BSDGPROG");
  USAGE.put("PROJECT_MENUS", "BSDPMENU");
 }

 public record Input(String PROJECT_NAME, String CUSTOMER_NAME, String DESCRIPTION, String STATUS, String START_DATE, String END_DATE, Long VERSION) { }

 private final JdbcTemplate jdbc;
 public ProjectService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

 private static ResponseStatusException invalid(String message) { return new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, message); }
 private static ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT, message); }
 private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트를 찾을 수 없습니다."); }

 private static Map<String, Object> upper(Map<String, Object> row) {
  var result = new LinkedHashMap<String, Object>();
  row.forEach((key, value) -> result.put(key.toUpperCase(Locale.ROOT), value));
  return result;
 }
 private static Object text(Object value) { return value == null ? null : value.toString(); }
 private Map<String, Object> shape(Map<String, Object> row) {
  var result = upper(row);
  result.put("START_DATE", text(result.get("START_DATE")));
  result.put("END_DATE", text(result.get("END_DATE")));
  result.put("REG_DT", text(result.get("REG_DT")));
  result.put("MOD_DT", text(result.get("MOD_DT")));
  return result;
 }

 /** The master name when the project is registered, otherwise what the caller sent, otherwise the ID. */
 public static String resolveName(JdbcTemplate jdbc, String projectId, String requested) {
  var names = jdbc.queryForList("SELECT PROJECT_NAME FROM BSDPROJ WHERE PROJECT_ID=? AND DEL_YN='N'", String.class, projectId);
  if (!names.isEmpty() && names.getFirst() != null && !names.getFirst().isBlank()) return names.getFirst();
  return requested == null || requested.isBlank() ? projectId : requested;
 }

 @Transactional(readOnly = true)
 public List<Map<String, Object>> list() {
  return jdbc.queryForList("SELECT " + COLUMNS + " FROM BSDPROJ WHERE DEL_YN='N' ORDER BY PROJECT_NAME,PROJECT_ID").stream().map(this::shape).toList();
 }

 @Transactional(readOnly = true)
 public Map<String, Object> get(String id) {
  var rows = jdbc.queryForList("SELECT " + COLUMNS + " FROM BSDPROJ WHERE PROJECT_ID=? AND DEL_YN='N'", id);
  if (rows.isEmpty()) throw missing();
  var project = shape(rows.getFirst());
  project.put("USAGE", usage(id));
  return project;
 }

 private Map<String, Integer> usage(String id) {
  var counts = new LinkedHashMap<String, Integer>();
  USAGE.forEach((key, table) -> counts.put(key, jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE PROJECT_ID=?", Integer.class, id)));
  return counts;
 }

 private record Checked(String name, String customer, String description, String status, LocalDate start, LocalDate end) { }

 private Checked check(Input input) {
  if (input == null) throw invalid("프로젝트 정보를 입력하세요.");
  String name = input.PROJECT_NAME() == null ? "" : input.PROJECT_NAME().strip();
  String customer = input.CUSTOMER_NAME() == null ? "" : input.CUSTOMER_NAME().strip();
  if (name.isEmpty() || customer.isEmpty()) throw invalid("프로젝트명과 고객명은 필수입니다.");
  if (name.length() > 200 || customer.length() > 200) throw invalid("프로젝트명과 고객명은 200자 이하로 입력하세요.");
  String description = input.DESCRIPTION() == null ? "" : input.DESCRIPTION();
  if (description.length() > 20000) throw invalid("설명은 20000자 이하로 입력하세요.");
  String status = input.STATUS() == null || input.STATUS().isBlank() ? "DRAFT" : input.STATUS().strip();
  if (!STATUSES.contains(status)) throw invalid("프로젝트 상태 값이 올바르지 않습니다.");
  if (input.START_DATE() == null || input.START_DATE().isBlank() || input.END_DATE() == null || input.END_DATE().isBlank()) throw invalid("프로젝트 시작일과 종료일은 필수입니다.");
  LocalDate start, end;
  try { start = LocalDate.parse(input.START_DATE().strip()); end = LocalDate.parse(input.END_DATE().strip()); }
  catch (DateTimeParseException e) { throw invalid("날짜는 YYYY-MM-DD 형식으로 입력하세요."); }
  if (start.isAfter(end)) throw invalid("프로젝트 시작일은 종료일보다 늦을 수 없습니다.");
  return new Checked(name, customer, description, status, start, end);
 }

 @Transactional
 public Map<String, Object> create(Input input) {
  var checked = check(input);
  String id = "SDP-" + UUID.randomUUID();
  jdbc.update("INSERT INTO BSDPROJ(PROJECT_ID,PROJECT_NAME,CUSTOMER_NAME,DESCRIPTION,STATUS,START_DATE,END_DATE) VALUES(?,?,?,?,?,?,?)",
   id, checked.name(), checked.customer(), checked.description(), checked.status(), checked.start(), checked.end());
  return get(id);
 }

 @Transactional
 public Map<String, Object> update(String id, Input input) {
  var checked = check(input);
  if (input.VERSION() == null) throw invalid("VERSION이 필요합니다.");
  int changed = jdbc.update("UPDATE BSDPROJ SET PROJECT_NAME=?,CUSTOMER_NAME=?,DESCRIPTION=?,STATUS=?,START_DATE=?,END_DATE=?,VERSION=VERSION+1,MOD_DT=CURRENT_TIMESTAMP WHERE PROJECT_ID=? AND DEL_YN='N' AND VERSION=?",
   checked.name(), checked.customer(), checked.description(), checked.status(), checked.start(), checked.end(), id, input.VERSION());
  if (changed == 0) throw notUpdated(id);
  return get(id);
 }

 /** Logical delete; refused while any server table still holds data of the project. */
 @Transactional
 public void delete(String id, Long version) {
  if (version == null) throw invalid("VERSION이 필요합니다.");
  get(id);
  var used = new ArrayList<String>();
  usage(id).forEach((key, count) -> { if (count > 0) used.add(label(key) + " " + count + "건"); });
  if (!used.isEmpty()) throw conflict("하위 데이터가 있어 삭제할 수 없습니다: " + String.join(", ", used));
  int changed = jdbc.update("UPDATE BSDPROJ SET DEL_YN='Y',VERSION=VERSION+1,MOD_DT=CURRENT_TIMESTAMP WHERE PROJECT_ID=? AND DEL_YN='N' AND VERSION=?", id, version);
  if (changed == 0) throw notUpdated(id);
 }

 private ResponseStatusException notUpdated(String id) {
  boolean exists = jdbc.queryForObject("SELECT COUNT(*) FROM BSDPROJ WHERE PROJECT_ID=? AND DEL_YN='N'", Integer.class, id) > 0;
  return exists ? conflict("다른 곳에서 먼저 변경되었습니다. 최신 내용을 조회한 후 다시 시도하세요.") : missing();
 }

 private static String label(String key) {
  return switch (key) {
   case "REQUIREMENTS" -> "요구사항";
   case "REQUIREMENT_GROUPS" -> "요구사항 그룹";
   case "GROUPING_ANALYSES" -> "AI 그룹핑 분석";
   case "PROGRAMS" -> "프로그램";
   default -> "프로젝트 메뉴";
  };
 }
}
