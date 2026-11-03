package com.caron.basekit.standarddesign.requirementgroup;

import com.caron.basekit.standarddesign.program.ProgramLedgerReader.Entry;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import java.util.*;

/**
 * Chooses how much of the program register is sent to the LLM. Programs are never cut by count:
 * the register is summarised in steps (FULL, COMPACT, MINIMAL) and only when even that does not fit
 * a deterministic relevance order decides which programs are sent. Omissions are always reported.
 */
final class ProgramInputBudget {
 record Selection(String detail, int total, int included, int omitted, int chars, ArrayNode items) { }

 private static final int COMPACT_DESCRIPTION = 80;
 private static final int FULL_REQUIREMENT_NAMES = 3;

 private ProgramInputBudget() { }

 /** budgetChars &lt;= 0 means no limit is configured: every program is sent in full. */
 static Selection select(List<Entry> ledger, long budgetChars, String groupId, Set<String> groupRequirementIds, String groupText, ObjectMapper json) {
  if (ledger.isEmpty()) return new Selection("NONE", 0, 0, 0, 0, json.createArrayNode());
  if (budgetChars <= 0) { var all = items(ledger, "FULL", json); return new Selection("FULL", ledger.size(), ledger.size(), 0, all.toString().length(), all); }
  for (String detail : List.of("FULL", "COMPACT", "MINIMAL")) {
   var all = items(ledger, detail, json);
   if (all.toString().length() <= budgetChars) return new Selection(detail, ledger.size(), ledger.size(), 0, all.toString().length(), all);
  }
  return relevant(ledger, budgetChars, groupId, groupRequirementIds, groupText, json);
 }

 private static Selection relevant(List<Entry> ledger, long budgetChars, String groupId, Set<String> groupRequirementIds, String groupText, ObjectMapper json) {
  var groupTokens = tokens(groupText);
  var order = new ArrayList<Integer>();
  var scores = new long[ledger.size()];
  for (int i = 0; i < ledger.size(); i++) {
   var entry = ledger.get(i);
   boolean linked = entry.requirementIds().stream().anyMatch(groupRequirementIds::contains);
   var own = tokens(entry.name() + " " + entry.description());
   own.retainAll(groupTokens);
   scores[i] = (linked ? 1_000_000L : 0L) + (groupId != null && groupId.equals(entry.sourceGroupId()) ? 100_000L : 0L) + own.size();
   order.add(i);
  }
  // Stable: equal scores keep the register order, so the result is deterministic.
  order.sort((left, right) -> Long.compare(scores[right], scores[left]));
  var chosen = json.createArrayNode();
  int size = 2;
  for (int index : order) {
   var item = item(ledger.get(index), "MINIMAL", json);
   int length = item.toString().length() + 1;
   if (size + length <= budgetChars) { chosen.add(item); size += length; }
  }
  return new Selection("RELEVANT", ledger.size(), chosen.size(), ledger.size() - chosen.size(), chosen.toString().length(), chosen);
 }

 private static ArrayNode items(List<Entry> ledger, String detail, ObjectMapper json) {
  var array = json.createArrayNode();
  for (var entry : ledger) array.add(item(entry, detail, json));
  return array;
 }

 private static com.fasterxml.jackson.databind.node.ObjectNode item(Entry entry, String detail, ObjectMapper json) {
  var item = json.createObjectNode().put("programId", entry.programId()).put("name", entry.name());
  if (entry.kind() != null) item.put("kind", entry.kind());
  if (detail.equals("FULL")) {
   item.put("description", entry.description());
   var names = item.putArray("requirementNames");
   entry.requirementNames().stream().limit(FULL_REQUIREMENT_NAMES).forEach(names::add);
  } else if (detail.equals("COMPACT")) {
   String text = entry.description();
   item.put("description", text.length() > COMPACT_DESCRIPTION ? text.substring(0, COMPACT_DESCRIPTION) + "…" : text);
  }
  return item;
 }

 static Set<String> tokens(String text) {
  var result = new LinkedHashSet<String>();
  for (String token : (text == null ? "" : text).toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+")) if (token.length() >= 2) result.add(token);
  return result;
 }
}
