package com.caron.basekit.standarddesign.screendesign;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** One screen design per program (current version only). The design itself is DESIGN_JSON; statuses are DRAFT and CONFIRMED. */
@Service
public class ScreenDesignService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public ScreenDesignService(JdbcTemplate jdbc, ObjectMapper json) { this.jdbc = jdbc; this.json = json; }

    private static ResponseStatusException status(HttpStatus status, String message) { return new ResponseStatusException(status, message); }

    /** The program must belong to the project; returns its row so callers can use name, purpose and version. */
    Map<String, Object> program(String project, String programId) {
        if (project == null || project.isBlank() || project.length() > 50) throw ScreenDesignValidator.bad("프로젝트 ID가 필요합니다.");
        var rows = jdbc.queryForList("SELECT PROGRAM_ID, PROGRAM_NAME, PURPOSE, VERSION FROM BSDGPROG WHERE PROJECT_ID = ? AND PROGRAM_ID = ?", project, programId);
        if (rows.isEmpty()) throw status(HttpStatus.NOT_FOUND, "프로그램을 찾을 수 없습니다.");
        return rows.get(0);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> summaries(String project) {
        if (project == null || project.isBlank() || project.length() > 50) throw ScreenDesignValidator.bad("프로젝트 ID가 필요합니다.");
        return jdbc.queryForList("SELECT PROGRAM_ID, DESIGN_STATUS, VERSION, PROGRAM_VERSION FROM BSDSCRN WHERE PROJECT_ID = ? AND DEL_YN = 'N' ORDER BY PROGRAM_ID", project)
            .stream().map(ScreenDesignService::upper).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> get(String project, String programId) {
        program(project, programId);
        var rows = jdbc.queryForList("SELECT * FROM BSDSCRN WHERE PROGRAM_ID = ? AND DEL_YN = 'N'", programId);
        return rows.isEmpty() ? null : view(rows.get(0));
    }

    @Transactional
    public Map<String, Object> save(String project, String programId, JsonNode request) {
        var program = program(project, programId);
        if (request == null || !request.isObject()) throw ScreenDesignValidator.bad("요청 형식을 확인하세요.");
        var design = ScreenDesignValidator.strict(json, request);
        Long expected = request.hasNonNull("VERSION") && request.get("VERSION").isIntegralNumber() ? request.get("VERSION").asLong() : null;
        var rows = jdbc.queryForList("SELECT VERSION FROM BSDSCRN WHERE PROGRAM_ID = ? AND DEL_YN = 'N'", programId);
        long programVersion = ((Number) program.get("VERSION")).longValue();
        String body = design.toString();
        if (rows.isEmpty()) {
            if (expected != null) throw status(HttpStatus.CONFLICT, "저장된 설계가 없습니다. 다시 조회하세요.");
            try {
                jdbc.update("INSERT INTO BSDSCRN(SCREEN_DESIGN_ID, PROJECT_ID, PROGRAM_ID, PROGRAM_VERSION, DESIGN_STATUS, SCREEN_TYPE, DESIGN_JSON) VALUES(?,?,?,?, 'DRAFT', ?, ?)",
                    "SDSC-" + UUID.randomUUID(), project, programId, programVersion, design.path("SCREEN_TYPE").asText(), body);
            } catch (DuplicateKeyException e) {
                throw status(HttpStatus.CONFLICT, "다른 곳에서 이미 설계가 저장되었습니다. 다시 조회하세요.");
            }
        } else {
            if (expected == null) throw ScreenDesignValidator.bad("VERSION이 필요합니다.");
            int changed = jdbc.update("UPDATE BSDSCRN SET PROGRAM_VERSION = ?, DESIGN_STATUS = 'DRAFT', SCREEN_TYPE = ?, DESIGN_JSON = ?, VERSION = VERSION + 1, MOD_DT = CURRENT_TIMESTAMP WHERE PROGRAM_ID = ? AND VERSION = ? AND DEL_YN = 'N'",
                programVersion, design.path("SCREEN_TYPE").asText(), body, programId, expected);
            if (changed == 0) throw status(HttpStatus.CONFLICT, "다른 곳에서 설계가 변경되었습니다. 다시 조회하세요.");
        }
        return get(project, programId);
    }

    @Transactional
    public Map<String, Object> confirm(String project, String programId, Long expected) {
        program(project, programId);
        var rows = jdbc.queryForList("SELECT DESIGN_STATUS, VERSION FROM BSDSCRN WHERE PROGRAM_ID = ? AND DEL_YN = 'N'", programId);
        if (rows.isEmpty()) throw status(HttpStatus.NOT_FOUND, "확정할 설계가 없습니다. 먼저 저장하세요.");
        if (expected == null) throw ScreenDesignValidator.bad("VERSION이 필요합니다.");
        if ("CONFIRMED".equals(rows.get(0).get("DESIGN_STATUS"))) throw status(HttpStatus.CONFLICT, "이미 확정된 설계입니다.");
        int changed = jdbc.update("UPDATE BSDSCRN SET DESIGN_STATUS = 'CONFIRMED', VERSION = VERSION + 1, MOD_DT = CURRENT_TIMESTAMP WHERE PROGRAM_ID = ? AND VERSION = ? AND DEL_YN = 'N'", programId, expected);
        if (changed == 0) throw status(HttpStatus.CONFLICT, "다른 곳에서 설계가 변경되었습니다. 다시 조회하세요.");
        return get(project, programId);
    }

    private static Map<String, Object> upper(Map<String, Object> row) {
        var result = new LinkedHashMap<String, Object>();
        row.forEach((key, value) -> result.put(key.toUpperCase(java.util.Locale.ROOT), value));
        return result;
    }

    private Map<String, Object> view(Map<String, Object> row) {
        var source = upper(row);
        var result = new LinkedHashMap<String, Object>();
        for (String key : List.of("SCREEN_DESIGN_ID", "PROJECT_ID", "PROGRAM_ID", "PROGRAM_VERSION", "DESIGN_STATUS", "VERSION", "MOD_DT")) result.put(key, source.get(key));
        try { result.put("DESIGN", json.readTree(String.valueOf(source.get("DESIGN_JSON")))); }
        catch (Exception e) { throw status(HttpStatus.INTERNAL_SERVER_ERROR, "저장된 설계를 읽을 수 없습니다."); }
        return result;
    }
}
