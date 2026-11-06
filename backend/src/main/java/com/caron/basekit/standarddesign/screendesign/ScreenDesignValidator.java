package com.caron.basekit.standarddesign.screendesign;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Validates and canonicalises a screen design (DESIGN_JSON). Used for user saves (strict) and for AI drafts (lenient only for
 * omitted optional values and missing FIELD_ID; unknown enum values are never guessed).
 */
public final class ScreenDesignValidator {
    public static final List<String> SCREEN_TYPES = List.of("GRID_DETAIL", "GRID_ONLY", "FORM_ONLY", "TREE_DETAIL", "POPUP");
    public static final List<String> CONTROL_TYPES = List.of("TEXT", "COMBO", "DATE", "DATE_RANGE", "CHECK", "POPUP_SELECT");
    public static final List<String> DATA_TYPES = List.of("TEXT", "NUMBER", "DATE", "BADGE");
    public static final List<String> ALIGNS = List.of("LEFT", "CENTER", "RIGHT");
    public static final List<String> ACTION_CODES = List.of("SEARCH", "CREATE", "UPDATE", "DELETE", "SAVE", "EXCEL_UPLOAD", "EXCEL_DOWNLOAD", "APPROVE");
    static final int MAX_ITEMS = 100, MAX_LABEL = 100, MAX_FIELD_ID = 60;

    private final ObjectMapper json;
    private final boolean lenient;

    private ScreenDesignValidator(ObjectMapper json, boolean lenient) { this.json = json; this.lenient = lenient; }

    public static ObjectNode strict(ObjectMapper json, JsonNode design) { return new ScreenDesignValidator(json, false).canonical(design); }
    public static ObjectNode lenient(ObjectMapper json, JsonNode design) { return new ScreenDesignValidator(json, true).canonical(design); }

    static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, message); }

    private ObjectNode canonical(JsonNode design) {
        if (design == null || !design.isObject()) throw bad("화면 설계 형식이 올바르지 않습니다.");
        var out = json.createObjectNode();
        String type = text(design, "SCREEN_TYPE", "SCREEN_TYPE");
        if (!SCREEN_TYPES.contains(type)) throw bad("SCREEN_TYPE 값이 허용되지 않습니다: " + type);
        out.put("SCREEN_TYPE", type);
        out.set("SEARCH_FIELDS", fields(design.path("SEARCH_FIELDS"), "SEARCH_FIELDS", "SF"));
        out.set("GRID_COLUMNS", columns(design.path("GRID_COLUMNS")));
        out.set("DETAIL_FIELDS", fields(design.path("DETAIL_FIELDS"), "DETAIL_FIELDS", "DF"));
        out.set("ACTION_CODES", actions(design.path("ACTION_CODES")));
        return out;
    }

    private String text(JsonNode node, String key, String path) {
        JsonNode value = node.path(key);
        if (!value.isTextual() || value.asText().isBlank()) throw bad(path + " 값이 필요합니다.");
        return value.asText().strip();
    }

    private ArrayNode array(JsonNode node, String path) {
        if (node.isMissingNode() || node.isNull()) { if (lenient) return json.createArrayNode(); throw bad(path + " 목록이 필요합니다."); }
        if (!node.isArray()) throw bad(path + "는 목록이어야 합니다.");
        if (node.size() > MAX_ITEMS) throw bad(path + "는 최대 " + MAX_ITEMS + "건까지 가능합니다.");
        return (ArrayNode) node;
    }

    private String label(JsonNode item, String path) {
        String label = text(item, "LABEL", path + ".LABEL");
        if (label.length() > MAX_LABEL) throw bad(path + ".LABEL은 " + MAX_LABEL + "자 이하여야 합니다.");
        return label;
    }

    private String fieldId(JsonNode item, String path, String prefix, int index, Set<String> seen) {
        String id = item.path("FIELD_ID").isTextual() ? item.path("FIELD_ID").asText().strip() : "";
        if (id.isEmpty()) {
            if (!lenient) throw bad(path + ".FIELD_ID가 필요합니다.");
            do { id = prefix + "-" + UUID.randomUUID().toString().substring(0, 8); } while (seen.contains(id));
        }
        if (id.length() > MAX_FIELD_ID) throw bad(path + ".FIELD_ID는 " + MAX_FIELD_ID + "자 이하여야 합니다.");
        if (!seen.add(id)) throw bad(path + ".FIELD_ID가 중복되었습니다: " + id);
        return id;
    }

    private String yn(JsonNode item, String key, String path) {
        JsonNode value = item.path(key);
        if (value.isMissingNode() || value.isNull()) { if (lenient) return "N"; throw bad(path + "." + key + " 값이 필요합니다."); }
        String text = value.asText();
        if (!"Y".equals(text) && !"N".equals(text)) throw bad(path + "." + key + "는 Y 또는 N이어야 합니다.");
        return text;
    }

    private String source(JsonNode item, String path) {
        JsonNode value = item.path("SOURCE");
        if (value.isMissingNode() || value.isNull()) { if (lenient) return "AI"; throw bad(path + ".SOURCE 값이 필요합니다."); }
        String text = value.asText();
        if (!"AI".equals(text) && !"USER".equals(text)) throw bad(path + ".SOURCE는 AI 또는 USER여야 합니다.");
        return text;
    }

    private String enumValue(JsonNode item, String key, String path, List<String> allowed, String defaultValue) {
        JsonNode value = item.path(key);
        if (value.isMissingNode() || value.isNull()) { if (lenient && defaultValue != null) return defaultValue; throw bad(path + "." + key + " 값이 필요합니다."); }
        String text = value.isTextual() ? value.asText().strip() : "";
        if (!allowed.contains(text)) throw bad(path + "." + key + " 값이 허용되지 않습니다: " + value.asText());
        return text;
    }

    private ArrayNode fields(JsonNode node, String name, String prefix) {
        var list = array(node, name);
        var out = json.createArrayNode();
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < list.size(); i++) {
            JsonNode item = list.get(i);
            String path = name + "[" + i + "]";
            if (!item.isObject()) throw bad(path + " 형식이 올바르지 않습니다.");
            var row = json.createObjectNode();
            row.put("FIELD_ID", fieldId(item, path, prefix, i, seen));
            row.put("LABEL", label(item, path));
            row.put("CONTROL_TYPE", enumValue(item, "CONTROL_TYPE", path, CONTROL_TYPES, "TEXT"));
            row.put("REQUIRED_YN", yn(item, "REQUIRED_YN", path));
            row.put("SOURCE", source(item, path));
            out.add(row);
        }
        return out;
    }

    private ArrayNode columns(JsonNode node) {
        var list = array(node, "GRID_COLUMNS");
        var out = json.createArrayNode();
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < list.size(); i++) {
            JsonNode item = list.get(i);
            String path = "GRID_COLUMNS[" + i + "]";
            if (!item.isObject()) throw bad(path + " 형식이 올바르지 않습니다.");
            var row = json.createObjectNode();
            row.put("FIELD_ID", fieldId(item, path, "GC", i, seen));
            row.put("LABEL", label(item, path));
            String dataType = enumValue(item, "DATA_TYPE", path, DATA_TYPES, "TEXT");
            row.put("DATA_TYPE", dataType);
            JsonNode width = item.path("WIDTH");
            int w;
            if (width.isMissingNode() || width.isNull()) { if (!lenient) throw bad(path + ".WIDTH 값이 필요합니다."); w = 120; }
            else if (!width.isIntegralNumber() || width.asInt() < 40 || width.asInt() > 800) throw bad(path + ".WIDTH는 40~800 사이 정수여야 합니다.");
            else w = width.asInt();
            row.put("WIDTH", w);
            String defaultAlign = "NUMBER".equals(dataType) ? "RIGHT" : "DATE".equals(dataType) || "BADGE".equals(dataType) ? "CENTER" : "LEFT";
            row.put("ALIGN", enumValue(item, "ALIGN", path, ALIGNS, defaultAlign));
            row.put("SOURCE", source(item, path));
            out.add(row);
        }
        return out;
    }

    private ArrayNode actions(JsonNode node) {
        var list = array(node, "ACTION_CODES");
        var out = json.createArrayNode();
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < list.size(); i++) {
            String code = list.get(i).isTextual() ? list.get(i).asText().strip() : "";
            if (!ACTION_CODES.contains(code)) throw bad("ACTION_CODES[" + i + "] 값이 허용되지 않습니다: " + list.get(i).asText());
            if (!seen.add(code)) throw bad("ACTION_CODES가 중복되었습니다: " + code);
            out.add(code);
        }
        return out;
    }
}
