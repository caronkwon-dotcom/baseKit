package com.caron.basekit.standarddesign.requirementgroup;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.*;
import java.util.function.Function;

/**
 * Validates a program list response against the request snapshot. A wrong judgment is never repaired
 * into NEW: the candidate keeps what the model said and is marked REVIEW_REQUIRED with the cause.
 */
final class ProgramListValidator {
 static final Set<String> DECISIONS = Set.of("REUSE", "CHANGE", "NEW");
 private static final int REASON_LIMIT = 120;
 private static final int UNCLASSIFIED_LIMIT = 200;
 private final ObjectMapper json;
 private final Function<String, Optional<String>> projectOfProgram;

 ProgramListValidator(ObjectMapper json, Function<String, Optional<String>> projectOfProgram) { this.json = json; this.projectOfProgram = projectOfProgram; }

 private static String cut(String text, int limit) { return text.length() > limit ? text.substring(0, limit) : text; }
 private static String text(JsonNode node, String field) { return node.path(field).isTextual() ? node.path(field).asText().strip() : ""; }

 ObjectNode validate(JsonNode value, JsonNode input) {
  if (value == null || !value.isObject() || !value.path("programs").isArray() || value.path("programs").size() > RequirementGroupAnalysisService.MAX_PROGRAMS
    || (value.has("unclassified") && !value.path("unclassified").isArray())) throw new IllegalArgumentException("Invalid programs");
  var allowed = new LinkedHashSet<String>();
  input.path("requirements").forEach(item -> allowed.add(item.path("requirementId").asText()));
  var sent = new HashMap<String, JsonNode>();
  input.path("existingPrograms").forEach(item -> sent.put(item.path("programId").asText(), item));
  String project = input.path("project").path("projectId").asText("");
  JsonNode info = input.path("existingProgramsInfo");
  boolean compared = info.isObject();

  var result = json.createObjectNode();
  var programs = result.putArray("programCandidates");
  var covered = new HashSet<String>();
  var ignored = new HashSet<String>();
  var targets = new HashMap<String, List<ObjectNode>>();
  for (JsonNode item : value.path("programs")) {
   if (!item.isObject() || !item.path("name").isTextual() || !item.path("purpose").isTextual() || !item.path("requirementIds").isArray()) throw new IllegalArgumentException("Invalid program");
   String name = text(item, "name"), purpose = text(item, "purpose");
   if (name.isEmpty() || name.length() > 100 || purpose.length() > 500) throw new IllegalArgumentException("Invalid program text");
   var ids = new LinkedHashSet<String>();
   for (JsonNode id : item.path("requirementIds")) {
    if (!id.isTextual()) throw new IllegalArgumentException("Invalid requirement id");
    if (allowed.contains(id.asText())) ids.add(id.asText()); else ignored.add(id.asText());
   }
   var next = programs.addObject().put("name", name);
   String kind = text(item, "type").toUpperCase(Locale.ROOT);
   if (RequirementGroupAnalysisService.PROGRAM_KINDS.contains(kind)) next.put("type", kind);
   next.put("purpose", purpose);
   var evidence = next.putArray("evidenceRequirementIds");
   ids.forEach(evidence::add);
   covered.addAll(ids);

   var issues = new ArrayList<String>();
   var warnings = next.putArray("warnings");
   if (ids.isEmpty()) issues.add("NO_VALID_EVIDENCE");
   String decision = text(item, "decision").toUpperCase(Locale.ROOT), existingId = text(item, "existingProgramId");
   JsonNode target = null;
   if (compared) {
    if (decision.isEmpty()) issues.add("DECISION_MISSING");
    else if (!DECISIONS.contains(decision)) issues.add("DECISION_INVALID");
    else if (decision.equals("NEW")) { if (!existingId.isEmpty()) issues.add("NEW_WITH_EXISTING_ID"); }
    else if (existingId.isEmpty()) issues.add("EXISTING_ID_MISSING");
    else if (sent.containsKey(existingId)) target = sent.get(existingId);
    else {
     var owner = projectOfProgram.apply(existingId);
     if (owner.isEmpty()) issues.add("EXISTING_ID_UNKNOWN");
     else if (!project.isEmpty() && !owner.get().equals(project)) issues.add("EXISTING_ID_OTHER_PROJECT");
     else issues.add("EXISTING_ID_NOT_PROVIDED");
    }
   }
   // What the model said is kept as is; only the server's verdict is added next to it.
   if (decision.isEmpty()) next.putNull("decision"); else next.put("decision", decision);
   if (existingId.isEmpty()) next.putNull("existingProgramId"); else next.put("existingProgramId", existingId);
   next.put("reason", cut(text(item, "reason"), REASON_LIMIT));
   String summary = cut(text(item, "changeSummary"), REASON_LIMIT);
   if (summary.isEmpty()) next.putNull("changeSummary"); else next.put("changeSummary", summary);
   if (target != null) {
    var existing = next.putObject("existing").put("programId", existingId).put("name", target.path("name").asText(""));
    String existingKind = target.path("kind").asText("");
    if (existingKind.isEmpty()) existing.putNull("kind"); else existing.put("kind", existingKind);
    if (!existingKind.isEmpty() && next.has("type") && !existingKind.equals(next.path("type").asText())) warnings.add("KIND_MISMATCH");
    if (decision.equals("CHANGE") && summary.isEmpty()) warnings.add("CHANGE_SUMMARY_MISSING");
    targets.computeIfAbsent(existingId, key -> new ArrayList<>()).add(next);
   }
   next.put("reviewStatus", issues.isEmpty() ? "OK" : "REVIEW_REQUIRED");
   var issueNode = next.putArray("issues");
   issues.forEach(issueNode::add);
  }
  if (programs.isEmpty()) throw new IllegalArgumentException("No valid programs");
  for (var group : targets.values()) if (group.size() > 1) for (var candidate : group) ((ArrayNode) candidate.get("warnings")).add("DUPLICATE_EXISTING_TARGET");

  var declared = new LinkedHashMap<String, String>();
  for (JsonNode entry : value.path("unclassified")) {
   if (!entry.isObject() || !entry.path("requirementId").isTextual()) continue;
   String id = entry.path("requirementId").asText();
   if (!allowed.contains(id)) { ignored.add(id); continue; }
   declared.putIfAbsent(id, text(entry, "reason"));
  }
  var unclassified = result.putArray("unclassified");
  int byAi = 0, byServer = 0, conflicts = 0;
  for (String id : allowed) {
   if (covered.contains(id)) { if (declared.containsKey(id)) conflicts++; continue; }
   if (declared.containsKey(id)) {
    String reason = cut(declared.get(id), UNCLASSIFIED_LIMIT);
    unclassified.addObject().put("requirementId", id).put("reason", reason.isEmpty() ? "AI가 사유를 적지 않았습니다." : reason).put("source", "AI");
    byAi++;
   } else {
    unclassified.addObject().put("requirementId", id).put("reason", "AI 응답에서 어떤 프로그램에도 연결되지 않았습니다.").put("source", "SERVER");
    byServer++;
   }
  }
  // Every requirement is either linked to a program or listed as unclassified, never lost.
  if (covered.size() + byAi + byServer != allowed.size()) throw new IllegalArgumentException("Coverage mismatch");
  result.putObject("coverage").put("total", allowed.size()).put("covered", covered.size()).put("unclassifiedByAi", byAi)
   .put("unclassifiedByServer", byServer).put("conflictsRemoved", conflicts).put("ignoredUnknownIds", ignored.size());
  if (compared) {
   int omitted = info.path("omitted").asInt(0);
   result.putObject("ledgerCompare").put("performed", true).put("total", info.path("total").asInt(0)).put("included", info.path("included").asInt(0))
    .put("omitted", omitted).put("detail", info.path("detail").asText("")).put("partial", omitted > 0);
  }
  return result;
 }
}
