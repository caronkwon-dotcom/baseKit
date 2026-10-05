package com.caron.basekit.standarddesign.analysis;

import com.fasterxml.jackson.databind.JsonNode;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;

/** JSON Schema + referential-integrity validation of the LLM analysis result. */
final class AnalysisResultValidator {
    static final Set<String> LAYOUTS = Set.of("SINGLE", "L1R2", "L1R1", "L2R1");
    static final Set<String> COMPONENTS = Set.of("SEARCH_PANEL", "GRID", "FORM", "TAB", "MODAL", "TOOLBAR", "DETAIL_PANEL");

    private final JsonSchema schema;

    AnalysisResultValidator() {
        try (InputStream in = getClass().getResourceAsStream("/schema/sd-analysis-result.schema.json")) {
            schema = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012).getSchema(in);
        } catch (IOException e) {
            throw new IllegalStateException("분석 결과 Schema를 읽을 수 없습니다.", e);
        }
    }

    List<String> validate(JsonNode root, Set<String> requirementIds) {
        List<String> errors = new ArrayList<>();
        schema.validate(root).forEach(m -> errors.add(m.getMessage()));
        if (!errors.isEmpty()) return errors;

        Set<String> menus = ids(root.path("BUSINESS_STRUCTURE").path("MENUS"), "TEMP_ID", errors, "MENU");
        Set<String> roles = ids(root.path("BUSINESS_STRUCTURE").path("ROLES"), "TEMP_ID", errors, "ROLE");
        Set<String> actions = ids(root.path("BUSINESS_STRUCTURE").path("ACTIONS"), "TEMP_ID", errors, "ACTION");
        Set<String> steps = ids(root.path("PROCESS_MODEL").path("STEPS"), "TEMP_ID", errors, "STEP");

        Set<String> connected = new HashSet<>();
        for (JsonNode t : root.path("PROCESS_MODEL").path("TRANSITIONS")) {
            String from = t.path("FROM").asText(), to = t.path("TO").asText();
            if (!steps.contains(from) || !steps.contains(to)) errors.add("TRANSITION이 존재하지 않는 STEP을 참조합니다: " + from + "→" + to);
            connected.add(from); connected.add(to);
        }
        if (steps.size() > 1) for (String s : steps) if (!connected.contains(s)) errors.add("연결되지 않은 STEP: " + s);

        for (JsonNode id : root.path("ANALYSIS_SUMMARY").path("SOURCE_REQUIREMENT_IDS"))
            if (!requirementIds.contains(id.asText())) errors.add("분석 요청에 없는 요구사항 참조: " + id.asText());

        String layout = root.path("LAYOUT_RECOMMENDATION").path("LAYOUT_TYPE").asText();
        if (!LAYOUTS.contains(layout)) errors.add("허용되지 않은 Layout: " + layout);
        for (JsonNode c : root.path("LAYOUT_RECOMMENDATION").path("COMPONENTS"))
            if (!COMPONENTS.contains(c.asText())) errors.add("허용되지 않은 Component: " + c.asText());

        Set<String> candidateIds = new HashSet<>();
        for (JsonNode c : root.path("SD_PROGRAM_CANDIDATES")) {
            String tid = c.path("TEMP_ID").asText();
            if (!candidateIds.add(tid)) errors.add("중복 후보 TEMP_ID: " + tid);
            if (c.path("PROGRAM_NAME").asText().isBlank() || c.path("PURPOSE").asText().isBlank()) errors.add("후보 이름/목적 누락: " + tid);
            for (JsonNode r : c.path("SOURCE_REQUIREMENT_IDS"))
                if (!requirementIds.contains(r.asText())) errors.add("후보가 분석 요청에 없는 요구사항을 참조: " + tid + "/" + r.asText());
            refs(c.path("MENU_TEMP_IDS"), menus, tid, errors);
            refs(c.path("ROLE_TEMP_IDS"), roles, tid, errors);
            refs(c.path("ACTION_TEMP_IDS"), actions, tid, errors);
            refs(c.path("STEP_TEMP_IDS"), steps, tid, errors);
            if (c.hasNonNull("LAYOUT_TYPE") && !LAYOUTS.contains(c.path("LAYOUT_TYPE").asText()))
                errors.add("후보 Layout이 허용되지 않음: " + tid);
        }
        return errors;
    }

    private static Set<String> ids(JsonNode array, String field, List<String> errors, String kind) {
        Set<String> out = new HashSet<>();
        for (JsonNode n : array) if (!out.add(n.path(field).asText())) errors.add("중복 " + kind + " TEMP_ID: " + n.path(field).asText());
        return out;
    }

    private static void refs(JsonNode array, Set<String> known, String owner, List<String> errors) {
        for (JsonNode n : array) if (!known.contains(n.asText())) errors.add("후보 " + owner + "가 존재하지 않는 TEMP_ID를 참조: " + n.asText());
    }
}
