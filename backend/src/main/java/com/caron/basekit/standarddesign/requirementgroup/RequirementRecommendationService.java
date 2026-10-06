package com.caron.basekit.standarddesign.requirementgroup;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Immutable completed recommendation runs, separate from Program analysis. */
@Service
public class RequirementRecommendationService {
    public record Item(String REQUIREMENT_ID, String ORIGINAL_REASON, OffsetDateTime REQUIREMENT_MOD_DT) { }
    public record SaveRequest(String PROJECT_ID, String REQUEST_ID, String ANALYSIS_BASIS,
                              OffsetDateTime EXECUTED_AT, List<Item> ITEMS) { }
    public record Result(String ANALYSIS_ID, String PROJECT_ID, String REQUEST_ID, String ANALYSIS_BASIS,
                         OffsetDateTime EXECUTED_AT, List<Item> ITEMS) { }
    private final JdbcTemplate jdbc;
    public RequirementRecommendationService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional(readOnly = true)
    public List<Result> list(String projectId) {
        required(projectId, "PROJECT_ID");
        return jdbc.queryForList("SELECT ANALYSIS_ID FROM BSDRANLS WHERE PROJECT_ID=? ORDER BY EXECUTED_AT DESC, ANALYSIS_ID", String.class, projectId)
                .stream().map(this::get).toList();
    }

    @Transactional(readOnly = true)
    public Result get(String id) {
        List<Result> rows = jdbc.query("SELECT ANALYSIS_ID,PROJECT_ID,REQUEST_ID,ANALYSIS_BASIS,EXECUTED_AT FROM BSDRANLS WHERE ANALYSIS_ID=?",
                (rs, n) -> new Result(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getObject(5, OffsetDateTime.class), List.of()), id);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "추천 Analysis를 찾을 수 없습니다.");
        Result row = rows.getFirst();
        List<Item> items = jdbc.query("SELECT REQUIREMENT_ID, ORIGINAL_REASON, REQUIREMENT_MOD_DT FROM BSDRARIT WHERE ANALYSIS_ID=? ORDER BY REQUIREMENT_ID",
                (rs, n) -> new Item(rs.getString(1), rs.getString(2), rs.getObject(3, OffsetDateTime.class)), id);
        return new Result(id, row.PROJECT_ID(), row.REQUEST_ID(), row.ANALYSIS_BASIS(), row.EXECUTED_AT(), items);
    }

    /** A producer may persist a completed run; this does not execute AI or add group members. */
    @Transactional
    public Result save(SaveRequest request) {
        if (request == null) throw invalid("요청이 필요합니다.");
        required(request.PROJECT_ID(), "PROJECT_ID"); required(request.REQUEST_ID(), "REQUEST_ID");
        required(request.ANALYSIS_BASIS(), "ANALYSIS_BASIS");
        if (request.EXECUTED_AT() == null || request.ITEMS() == null) throw invalid("실행시각과 추천 항목이 필요합니다.");
        if (request.PROJECT_ID().length() > 50 || request.REQUEST_ID().length() > 100 || request.ANALYSIS_BASIS().length() > 10000)
            throw invalid("저장 가능한 필드 길이를 초과했습니다.");
        var ids = new java.util.HashSet<String>();
        for (Item item : request.ITEMS()) {
            if (item == null) throw invalid("추천 항목이 필요합니다.");
            required(item.REQUIREMENT_ID(), "REQUIREMENT_ID"); required(item.ORIGINAL_REASON(), "ORIGINAL_REASON");
            if (item.ORIGINAL_REASON().length() > 10000 || item.REQUIREMENT_MOD_DT() == null || !ids.add(item.REQUIREMENT_ID()))
                throw invalid("중복 항목, 원본 사유 또는 요구사항 기준시각을 확인하세요.");
        }
        // Deterministic locks protect references from concurrent Requirement updates/deletes.
        for (String id : ids.stream().sorted().toList()) {
            var rows = jdbc.queryForList("SELECT PROJECT_ID FROM BSDRREQ WHERE REQUIREMENT_ID=? FOR UPDATE", id);
            if (rows.isEmpty() || !request.PROJECT_ID().equals(rows.getFirst().get("PROJECT_ID")))
                throw invalid("추천 항목은 존재하는 동일 프로젝트 Requirement여야 합니다.");
        }
        List<String> existing = jdbc.queryForList("SELECT ANALYSIS_ID FROM BSDRANLS WHERE PROJECT_ID=? AND REQUEST_ID=?", String.class,
                request.PROJECT_ID(), request.REQUEST_ID());
        if (!existing.isEmpty()) {
            Result result = get(existing.getFirst());
            if (!same(result, request)) throw new ResponseStatusException(HttpStatus.CONFLICT, "같은 REQUEST_ID에 다른 결과를 저장할 수 없습니다.");
            return result;
        }
        String id = "RAN-" + UUID.randomUUID().toString().replace("-", "");
        jdbc.update("INSERT INTO BSDRANLS(ANALYSIS_ID,PROJECT_ID,REQUEST_ID,ANALYSIS_BASIS,EXECUTED_AT) VALUES (?,?,?,?,?)",
                id, request.PROJECT_ID(), request.REQUEST_ID(), request.ANALYSIS_BASIS(), request.EXECUTED_AT().truncatedTo(java.time.temporal.ChronoUnit.MICROS));
        for (Item item : request.ITEMS()) jdbc.update("INSERT INTO BSDRARIT(ANALYSIS_ID,PROJECT_ID,REQUIREMENT_ID,ORIGINAL_REASON,REQUIREMENT_MOD_DT) VALUES (?,?,?,?,?)",
                id, request.PROJECT_ID(), item.REQUIREMENT_ID(), item.ORIGINAL_REASON(), item.REQUIREMENT_MOD_DT().truncatedTo(java.time.temporal.ChronoUnit.MICROS));
        return get(id);
    }

    private boolean same(Result result, SaveRequest request) {
        var order = java.util.Comparator.comparing(Item::REQUIREMENT_ID);
        return result.ANALYSIS_BASIS().equals(request.ANALYSIS_BASIS())
                && result.EXECUTED_AT().toInstant().equals(request.EXECUTED_AT().toInstant().truncatedTo(java.time.temporal.ChronoUnit.MICROS))
                && result.ITEMS().stream().sorted(order).map(this::canonical).toList()
                .equals(request.ITEMS().stream().sorted(order).map(this::canonical).toList());
    }
    private List<Object> canonical(Item item) {
        return List.of(item.REQUIREMENT_ID(), item.ORIGINAL_REASON(), item.REQUIREMENT_MOD_DT().toInstant().truncatedTo(java.time.temporal.ChronoUnit.MICROS));
    }
    private static void required(String value, String field) {
        if (value == null || value.isBlank()) throw invalid(field + " 값이 필요합니다.");
    }
    private static ResponseStatusException invalid(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
}
