package com.caron.basekit.standarddesign.analysis;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.HashSet;
import java.util.Set;

/** Candidate validation shared by confirm, view and generation. BLOCK stops, WARN informs. */
final class CandidateRules {
    private CandidateRules() { }

    static ArrayNode issues(JsonNode c, Set<String> analysisRequirementIds, Set<String> existingProjectMenuIds, boolean hasUnresolved) {
        ArrayNode out = JsonNodeFactory.instance.arrayNode();
        if (c.path("PROGRAM_NAME").asText().isBlank()) add(out, "BLOCK", "NAME_REQUIRED", "Program명이 없습니다.");
        if (c.path("PURPOSE").asText().isBlank()) add(out, "BLOCK", "PURPOSE_REQUIRED", "Program 목적이 없습니다.");
        Set<String> reqs = new HashSet<>();
        c.path("SOURCE_REQUIREMENT_IDS").forEach(n -> reqs.add(n.asText()));
        if (reqs.isEmpty()) add(out, "BLOCK", "REQUIREMENT_REQUIRED", "연결된 요구사항이 없습니다.");
        for (String r : reqs) if (!analysisRequirementIds.contains(r)) add(out, "BLOCK", "REQUIREMENT_OUT_OF_SCOPE", "분석 범위에 없는 요구사항입니다: " + r);
        if (c.hasNonNull("LAYOUT_TYPE") && !AnalysisResultValidator.LAYOUTS.contains(c.path("LAYOUT_TYPE").asText()))
            add(out, "BLOCK", "LAYOUT_INVALID", "허용되지 않은 Layout입니다.");
        JsonNode mappings = c.path("MENU_MAPPINGS");
        mappings.fields().forEachRemaining(e -> {
            String id = e.getValue().asText();
            if (!id.isBlank() && !existingProjectMenuIds.contains(id)) add(out, "BLOCK", "MENU_MAPPING_INVALID", "Project Menu가 존재하지 않습니다: " + id);
        });
        for (JsonNode m : c.path("MENU_TEMP_IDS"))
            if (mappings.path(m.asText()).asText().isBlank()) { add(out, "WARN", "MENU_UNMAPPED", "Menu가 기존 Project Menu에 연결되지 않았습니다."); break; }
        if (c.path("ROLE_TEMP_IDS").size() > 0) add(out, "WARN", "ROLE_UNMAPPED", "Role은 자동 생성·연결되지 않습니다. 시스템 관리에서 별도 승인이 필요합니다.");
        if (c.path("ACTION_TEMP_IDS").size() > 0) add(out, "WARN", "ACTION_UNMAPPED", "Action은 자동 생성·연결되지 않습니다. Program 상세 설계에서 정의하세요.");
        if (hasUnresolved) add(out, "WARN", "UNRESOLVED_ITEMS", "분석 결과에 미결정 항목이 있습니다.");
        return out;
    }

    static boolean blocked(ArrayNode issues) {
        for (JsonNode n : issues) if ("BLOCK".equals(n.path("LEVEL").asText())) return true;
        return false;
    }

    private static void add(ArrayNode out, String level, String code, String message) {
        ObjectNode n = out.addObject();
        n.put("LEVEL", level);
        n.put("CODE", code);
        n.put("MESSAGE", message);
    }
}
