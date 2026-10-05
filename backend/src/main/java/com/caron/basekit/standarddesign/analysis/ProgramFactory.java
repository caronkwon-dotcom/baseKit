package com.caron.basekit.standarddesign.analysis;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.*;

/** Creates only the SD Program skeleton (+ requirement/menu relations). Never MENU/ROLE/ACTION/Runtime/permission/code. */
@Component
public class ProgramFactory {
    private final JdbcTemplate jdbc;
    private final ObjectMapper om;
    private final TransactionTemplate tx;

    ProgramFactory(JdbcTemplate jdbc, ObjectMapper om, TransactionTemplate tx) {
        this.jdbc = jdbc;
        this.om = om;
        this.tx = tx;
    }

    /** Idempotent per candidate: a candidate that already has a Program returns that Program. */
    public String create(String candidateId) {
        return tx.execute(status -> {
            List<String> existing = jdbc.queryForList("SELECT PROGRAM_ID FROM BSDGPROG WHERE SOURCE_CANDIDATE_ID=?", String.class, candidateId);
            if (!existing.isEmpty()) {
                markGenerated(candidateId, existing.getFirst());
                return existing.getFirst();
            }
            Map<String, Object> c = jdbc.queryForMap("SELECT c.ANALYSIS_ID, c.RESULT_VERSION, c.ORIGINAL_JSON, c.EDITED_JSON, a.PROJECT_ID FROM BSDACAND c JOIN BSDAANLS a ON a.ANALYSIS_ID=c.ANALYSIS_ID WHERE c.CANDIDATE_ID=?", candidateId);
            String analysisId = (String) c.get("ANALYSIS_ID");
            String projectId = (String) c.get("PROJECT_ID");
            JsonNode effective = read(c.get("EDITED_JSON") != null ? (String) c.get("EDITED_JSON") : (String) c.get("ORIGINAL_JSON"));
            Set<String> reqIds = new HashSet<>(jdbc.queryForList("SELECT REQUIREMENT_ID FROM BSDAAREQ WHERE ANALYSIS_ID=?", String.class, analysisId));
            Set<String> menuIds = new HashSet<>(jdbc.queryForList("SELECT PROJECT_MENU_ID FROM BSDPMENU WHERE PROJECT_ID=?", String.class, projectId));
            if (CandidateRules.blocked(CandidateRules.issues(effective, reqIds, menuIds, false)))
                throw new AnalysisException(HttpStatus.UNPROCESSABLE_ENTITY, "CANDIDATE_BLOCKED", "후보에 생성을 막는 검증 오류가 있습니다.");

            String programId = "SDPG-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
            String layout = effective.hasNonNull("LAYOUT_TYPE") ? effective.path("LAYOUT_TYPE").asText() : null;
            jdbc.update("INSERT INTO BSDGPROG(PROGRAM_ID,PROJECT_ID,PROGRAM_NAME,PURPOSE,LAYOUT_TYPE,SOURCE_ANALYSIS_ID,SOURCE_RESULT_VERSION,SOURCE_CANDIDATE_ID,STATUS) VALUES (?,?,?,?,?,?,?,?,'DRAFT')",
                    programId, projectId, effective.path("PROGRAM_NAME").asText(), effective.path("PURPOSE").asText(), layout, analysisId, c.get("RESULT_VERSION"), candidateId);
            for (JsonNode r : effective.path("SOURCE_REQUIREMENT_IDS"))
                jdbc.update("INSERT INTO BSDGPREQ(PROGRAM_ID,REQUIREMENT_ID) SELECT ?,? WHERE NOT EXISTS (SELECT 1 FROM BSDGPREQ WHERE PROGRAM_ID=? AND REQUIREMENT_ID=?)", programId, r.asText(), programId, r.asText());
            Set<String> mapped = new LinkedHashSet<>();
            effective.path("MENU_MAPPINGS").fields().forEachRemaining(e -> { if (!e.getValue().asText().isBlank()) mapped.add(e.getValue().asText()); });
            for (String menuId : mapped) jdbc.update("INSERT INTO BSDGPMNU(PROGRAM_ID,PROJECT_MENU_ID) VALUES (?,?)", programId, menuId);
            markGenerated(candidateId, programId);
            return programId;
        });
    }

    private void markGenerated(String candidateId, String programId) {
        jdbc.update("UPDATE BSDACAND SET GENERATED_YN='Y', GENERATED_PROGRAM_ID=?, UPDATED_AT=CURRENT_TIMESTAMP WHERE CANDIDATE_ID=?", programId, candidateId);
    }

    private JsonNode read(String json) {
        try { return om.readTree(json); } catch (Exception e) { throw new IllegalStateException(e); }
    }
}
