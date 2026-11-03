package com.caron.basekit.standarddesign.requirementgroup;

import com.caron.basekit.standarddesign.program.ProgramLedgerReader.Entry;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class ProgramInputBudgetTest {
 private final ObjectMapper json = new ObjectMapper();

 private Entry entry(int number, String name, String description, String group, String... requirementIds) {
  return new Entry("SDPG-" + String.format("%04d", number), name, description, "SCREEN", 1, group, List.of(requirementIds), List.of("요구사항 " + number, "요구사항 " + (number + 1), "요구사항 " + (number + 2), "요구사항 " + (number + 3)));
 }
 private List<Entry> ledger(int count, int descriptionChars) {
  var list = new ArrayList<Entry>();
  for (int i = 0; i < count; i++) list.add(entry(i, "프로그램 " + i, "설명 ".repeat(Math.max(1, descriptionChars / 3)), "G-" + (i % 5), "REQ-" + i));
  return list;
 }
 private ProgramInputBudget.Selection select(List<Entry> ledger, long budget) {
  return ProgramInputBudget.select(ledger, budget, "G-X", Set.of("REQ-LINKED"), "주문 승인 처리", json);
 }

 @Test void emptyRegisterSendsNothing() {
  var selection = select(List.of(), 1000);
  assertEquals("NONE", selection.detail());
  assertEquals(0, selection.total());
  assertEquals(0, selection.items().size());
 }

 @Test void withoutAConfiguredLimitEveryProgramIsSentInFull() {
  var selection = select(ledger(40, 300), 0);
  assertEquals("FULL", selection.detail());
  assertEquals(40, selection.included());
  assertEquals(0, selection.omitted());
  assertTrue(selection.items().get(0).has("requirementNames"));
 }

 @Test void tiersShrinkTheSummaryBeforeAnyProgramIsDropped() {
  var data = ledger(30, 300);
  int full = select(data, 0).chars();
  var compact = select(data, full - 1);
  assertEquals("COMPACT", compact.detail());
  assertEquals(30, compact.included());
  assertTrue(compact.items().get(0).path("description").asText().length() <= 81);
  assertFalse(compact.items().get(0).has("requirementNames"));
  var minimal = select(data, compact.chars() - 1);
  assertEquals("MINIMAL", minimal.detail());
  assertEquals(30, minimal.included());
  assertFalse(minimal.items().get(0).has("description"));
  assertEquals("SDPG-0000", minimal.items().get(0).path("programId").asText());
 }

 @Test void relevanceOrderIsUsedOnlyWhenEvenTheMinimalSummaryDoesNotFit() {
  var data = new ArrayList<>(ledger(40, 300));
  data.add(entry(900, "주문 승인 관리", "주문 승인", "G-other", "REQ-LINKED"));
  data.add(entry(901, "주문 승인 화면", "주문을 승인", "G-X"));
  int minimal = select(data, 1).chars();
  var minimalAll = ProgramInputBudget.select(data, Long.MAX_VALUE / 2, "G-X", Set.of("REQ-LINKED"), "주문 승인 처리", json);
  assertEquals("FULL", minimalAll.detail());
  long budget = 600;
  var selection = select(data, budget);
  assertEquals("RELEVANT", selection.detail());
  assertEquals(data.size(), selection.total());
  assertEquals(selection.total(), selection.included() + selection.omitted());
  assertTrue(selection.omitted() > 0);
  assertTrue(selection.chars() <= budget);
  var ids = new ArrayList<String>();
  selection.items().forEach(item -> ids.add(item.path("programId").asText()));
  // The program already linked to a requirement of this group comes first, then the one registered from this group.
  assertEquals("SDPG-0900", ids.get(0));
  assertEquals("SDPG-0901", ids.get(1));
  assertTrue(minimal > 0);
 }

 @Test void theSelectionIsDeterministic() {
  var data = ledger(60, 200);
  var first = select(data, 700);
  var second = select(data, 700);
  assertEquals(first.items().toString(), second.items().toString());
  assertEquals(first.omitted(), second.omitted());
 }

 @Test void nothingFitsMeansEverythingIsReportedAsOmitted() {
  var selection = select(ledger(5, 100), 5);
  assertEquals("RELEVANT", selection.detail());
  assertEquals(0, selection.included());
  assertEquals(5, selection.omitted());
 }

 /** Not an assertion of a limit: prints serialized sizes so real token limits can be derived from measurements. */
 @Test void printsSerializedSizesPerRegisterSize() {
  long previous = 0;
  for (int count : List.of(10, 50, 100, 200, 400)) {
   var data = ledger(count, 150);
   int full = select(data, 0).chars();
   int compact = ProgramInputBudget.select(data, full - 1, "G", Set.of(), "", json).chars();
   int minimal = ProgramInputBudget.select(data, compact - 1, "G", Set.of(), "", json).chars();
   System.out.println("SIZE programs=" + count + " FULL=" + full + " COMPACT=" + compact + " MINIMAL=" + minimal);
   assertTrue(full > compact && compact > minimal);
   assertTrue(full > previous);
   previous = full;
  }
  System.out.println("SIZE systemPromptChars=" + com.caron.basekit.standarddesign.requirementgroup.RequirementGroupAnalysisService.PROGRAMS_PROMPT.length()
   + " bytes=" + com.caron.basekit.standarddesign.requirementgroup.RequirementGroupAnalysisService.PROGRAMS_PROMPT.getBytes(java.nio.charset.StandardCharsets.UTF_8).length);
 }
}
