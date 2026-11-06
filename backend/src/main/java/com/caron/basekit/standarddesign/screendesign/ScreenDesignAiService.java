package com.caron.basekit.standarddesign.screendesign;

import com.caron.basekit.standarddesign.llm.DesignLlmClient;
import com.caron.basekit.standarddesign.llm.LlmConnectionException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Builds a screen design draft with the company LLM. Nothing is saved: the validated draft is returned to the screen, which
 * the user reviews and saves. Prompts and raw model output are neither stored nor logged (only sizes), because requirement
 * snapshots may contain customer information.
 */
@Service
public class ScreenDesignAiService {
    private static final Logger log = LoggerFactory.getLogger(ScreenDesignAiService.class);
    static final int MAX_EVIDENCE = 30, MAX_FIELD_CHARS = 1500;
    static final String SYSTEM_PROMPT = """
        당신은 업무 시스템 화면 설계자입니다. 주어진 프로그램 하나의 화면(UI) 설계 초안을 JSON으로만 답하세요. 설명 문장, 코드블록, 주석을 쓰지 마세요.
        허용 값 — SCREEN_TYPE: GRID_DETAIL, GRID_ONLY, FORM_ONLY, TREE_DETAIL, POPUP.
        CONTROL_TYPE: TEXT, COMBO, DATE, DATE_RANGE, CHECK, POPUP_SELECT. DATA_TYPE: TEXT, NUMBER, DATE, BADGE. ALIGN: LEFT, CENTER, RIGHT.
        ACTION_CODES: SEARCH, CREATE, UPDATE, DELETE, SAVE, EXCEL_UPLOAD, EXCEL_DOWNLOAD, APPROVE (프로그램에 필요한 것만).
        출력 형식: {"SCREEN_TYPE":"...","SEARCH_FIELDS":[{"LABEL":"...","CONTROL_TYPE":"...","REQUIRED_YN":"Y|N"}],"GRID_COLUMNS":[{"LABEL":"...","DATA_TYPE":"...","WIDTH":120,"ALIGN":"..."}],"DETAIL_FIELDS":[{"LABEL":"...","CONTROL_TYPE":"...","REQUIRED_YN":"Y|N"}],"ACTION_CODES":["SEARCH"]}
        규칙: 근거 요구사항에 있는 업무 용어를 사용하고 없는 기능을 지어내지 마세요. 항목은 검색조건 1~6개, 그리드 컬럼 3~12개, 상세 입력항목 2~20개 정도로 간결하게 하세요. 근거가 없으면 프로그램명과 설명만으로 보수적으로 작성하세요.
        """;

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final DesignLlmClient llm;
    private final ScreenDesignService designs;
    private final int maxOutputTokens, timeoutSeconds;

    public ScreenDesignAiService(JdbcTemplate jdbc, ObjectMapper json, DesignLlmClient llm, ScreenDesignService designs,
                                 @Value("${standard-design.screen-design.max-output-tokens:4000}") int maxOutputTokens,
                                 @Value("${standard-design.screen-design.timeout-seconds:120}") int timeoutSeconds) {
        this.jdbc = jdbc; this.json = json; this.llm = llm; this.designs = designs;
        this.maxOutputTokens = maxOutputTokens; this.timeoutSeconds = timeoutSeconds;
    }

    private static String clip(Object value) {
        String text = value == null ? "" : String.valueOf(value);
        return text.length() > MAX_FIELD_CHARS ? text.substring(0, MAX_FIELD_CHARS) + "…" : text;
    }

    String userPrompt(Map<String, Object> program, List<Map<String, Object>> evidence) {
        var input = json.createObjectNode();
        input.put("programName", String.valueOf(program.get("PROGRAM_NAME")));
        input.put("programDescription", clip(program.get("PURPOSE")));
        var list = input.putArray("evidenceRequirements");
        for (var row : evidence.stream().limit(MAX_EVIDENCE).toList()) {
            var item = list.addObject();
            item.put("requirementId", String.valueOf(row.get("REQUIREMENT_ID")));
            Object snapshot = row.get("SNAPSHOT_JSON");
            if (snapshot == null) continue;
            try {
                JsonNode node = json.readTree(String.valueOf(snapshot));
                item.put("name", clip(node.path("name").asText("")));
                item.put("description", clip(node.path("description").asText("")));
                item.put("processDescription", clip(node.path("processDescription").asText("")));
            } catch (Exception ignored) { /* A snapshot that cannot be read only loses its detail. */ }
        }
        return input + "\nReturn JSON only. /no_think";
    }

    @Transactional(readOnly = true)
    public Map<String, Object> draft(String project, String programId) {
        var program = designs.program(project, programId);
        var evidence = jdbc.queryForList("SELECT REQUIREMENT_ID, SNAPSHOT_JSON FROM BSDGPREQ WHERE PROGRAM_ID = ? ORDER BY REQUIREMENT_ID", programId);
        String prompt = userPrompt(program, evidence);
        var options = new DesignLlmClient.LlmChatOptions(maxOutputTokens, 0.2, false, timeoutSeconds);
        DesignLlmClient.LlmChatResult reply;
        try { reply = llm.chatRaw(SYSTEM_PROMPT, prompt, options); }
        catch (LlmConnectionException e) { throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "회사 LLM에 연결하지 못했습니다. 기존 편집 내용은 그대로 유지됩니다."); }
        log.info("screen-design AI draft program={} evidence={} promptChars={} replyChars={}", programId, evidence.size(), prompt.length(), reply.content() == null ? 0 : reply.content().length());
        if (reply.httpStatus() < 200 || reply.httpStatus() >= 300) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "LLM 서버가 요청을 거부했습니다. (HTTP " + reply.httpStatus() + ")");
        ObjectNode design = parse(reply.content());
        var result = new LinkedHashMap<String, Object>();
        result.put("DESIGN", design);
        result.put("MODEL", reply.model());
        result.put("PROGRAM_VERSION", program.get("VERSION"));
        result.put("EVIDENCE_COUNT", evidence.size());
        result.put("EVIDENCE_USED", Math.min(evidence.size(), MAX_EVIDENCE));
        return result;
    }

    /** Accepts either the model text or an OpenAI-style envelope; never repairs content, only unwraps fences and surrounding prose. */
    ObjectNode parse(String raw) {
        String text = raw == null ? "" : raw.strip();
        try {
            JsonNode envelope = json.readTree(text);
            if (envelope.has("choices")) {
                String reason = envelope.path("choices").path(0).path("finish_reason").asText("");
                if (List.of("length", "max_tokens", "token_limit").contains(reason)) throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "모델이 출력 한도에 도달해 초안이 잘렸습니다. 기존 편집 내용은 유지됩니다.");
                text = envelope.path("choices").path(0).path("message").path("content").asText("").strip();
            }
        } catch (ResponseStatusException e) { throw e; }
        catch (Exception ignored) { /* Plain model text. */ }
        text = text.replaceAll("(?s)^```[a-zA-Z]*\\s*", "").replaceAll("(?s)\\s*```$", "").strip();
        int from = text.indexOf('{'), to = text.lastIndexOf('}');
        if (from < 0 || to <= from) throw unreadable();
        JsonNode node;
        try { node = json.readTree(text.substring(from, to + 1)); }
        catch (Exception e) { throw unreadable(); }
        ObjectNode design;
        try { design = ScreenDesignValidator.lenient(json, node); }
        catch (ResponseStatusException e) { throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "AI 초안이 설계 규격에 맞지 않습니다. " + e.getReason() + " 기존 편집 내용은 유지됩니다."); }
        for (String key : List.of("SEARCH_FIELDS", "GRID_COLUMNS", "DETAIL_FIELDS")) design.path(key).forEach(item -> ((ObjectNode) item).put("SOURCE", "AI"));
        return design;
    }

    private static ResponseStatusException unreadable() {
        return new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "AI 응답을 JSON으로 해석하지 못했습니다. 기존 편집 내용은 유지됩니다.");
    }
}
