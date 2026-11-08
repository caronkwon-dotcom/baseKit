package com.caron.basekit.standarddesign.requirement;

import com.caron.basekit.standarddesign.program.ProgramReviewStatus;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Read-only trace of requirements: requirement → group → program (adopted evidence) → screen design (confirmed, with the function
 * specs that name the requirement). Nothing here is stored; the design JSON is parsed on read.
 *
 * TRACE_STATE, strongest first: DESIGN_REFLECTED (a CONFIRMED screen design of a program that has the requirement as evidence lists it in
 * a function spec's REQUIREMENT_IDS), PROGRAM (it is evidence of a program), GROUP_ONLY (it belongs to a group only), UNLINKED.
 * Until design documents are issued with a history, "design reflected" means exactly this and nothing more.
 */
@Service
public class RequirementTraceService {
    public static final String DESIGN_REFLECTED = "DESIGN_REFLECTED", PROGRAM = "PROGRAM", GROUP_ONLY = "GROUP_ONLY", UNLINKED = "UNLINKED";

    private record Group(String id, String name, String status) { }
    private record Evidence(String requirementId, String programId, String programName, String sourceGroupId, Long snapshotRevision) { }
    private record Design(String status, long version, Map<String, List<Map<String, Object>>> functionsByRequirement) { }

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public RequirementTraceService(JdbcTemplate jdbc, ObjectMapper json) { this.jdbc = jdbc; this.json = json; }

    private static ResponseStatusException status(HttpStatus status, String message) { return new ResponseStatusException(status, message); }

    private static String project(String project) {
        if (project == null || project.isBlank() || project.length() > 50) throw status(HttpStatus.UNPROCESSABLE_ENTITY, "프로젝트 ID가 필요합니다.");
        return project;
    }

    /** What the queries return for one project (or for one requirement of it). */
    private record Loaded(Map<String, Long> revisions, Map<String, List<Group>> groups, Map<String, List<Evidence>> evidence, Map<String, Design> designs) { }

    private Loaded load(String project, String onlyRequirement) {
        Map<String, Long> revisions = new LinkedHashMap<>();
        String filter = onlyRequirement == null ? "" : " AND REQUIREMENT_ID = ?";
        Object[] args = onlyRequirement == null ? new Object[] {project} : new Object[] {project, onlyRequirement};
        jdbc.query("SELECT REQUIREMENT_ID, REQUIREMENT_REVISION FROM BSDRREQ WHERE PROJECT_ID = ?" + filter + " ORDER BY REQUIREMENT_ID", rs -> { revisions.put(rs.getString(1), rs.getLong(2)); }, args);

        Map<String, List<Group>> groups = new HashMap<>();
        jdbc.query("SELECT Q.REQUIREMENT_ID, G.REQUIREMENT_GROUP_ID, G.REQUIREMENT_GROUP_NAME, G.GROUP_STATUS FROM BSDRGRQ Q JOIN BSDRGRP G ON G.REQUIREMENT_GROUP_ID = Q.REQUIREMENT_GROUP_ID"
            + " WHERE Q.PROJECT_ID = ?" + filter.replace("REQUIREMENT_ID", "Q.REQUIREMENT_ID") + " ORDER BY G.REQUIREMENT_GROUP_ID",
            rs -> { groups.computeIfAbsent(rs.getString(1), key -> new ArrayList<>()).add(new Group(rs.getString(2), rs.getString(3), rs.getString(4))); }, args);

        Map<String, List<Evidence>> evidence = new HashMap<>();
        jdbc.query("SELECT E.REQUIREMENT_ID, E.PROGRAM_ID, P.PROGRAM_NAME, P.SOURCE_GROUP_ID, E.REQUIREMENT_REVISION FROM BSDGPREQ E JOIN BSDGPROG P ON P.PROGRAM_ID = E.PROGRAM_ID"
            + " WHERE P.PROJECT_ID = ?" + filter.replace("REQUIREMENT_ID", "E.REQUIREMENT_ID") + " ORDER BY E.PROGRAM_ID",
            rs -> { long rev = rs.getLong(5); Long snapshot = rs.wasNull() ? null : rev;
                evidence.computeIfAbsent(rs.getString(1), key -> new ArrayList<>()).add(new Evidence(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), snapshot)); }, args);

        Map<String, Design> designs = new HashMap<>();
        var needed = evidence.values().stream().flatMap(List::stream).map(Evidence::programId).distinct().toList();
        if (onlyRequirement == null || !needed.isEmpty()) {
            jdbc.query("SELECT PROGRAM_ID, DESIGN_STATUS, VERSION, DESIGN_JSON FROM BSDSCRN WHERE PROJECT_ID = ? AND DEL_YN = 'N'", rs -> {
                String programId = rs.getString(1);
                if (onlyRequirement != null && !needed.contains(programId)) return;
                designs.put(programId, new Design(rs.getString(2), rs.getLong(3), functions(rs.getString(4))));
            }, project);
        }
        return new Loaded(revisions, groups, evidence, designs);
    }

    /** Requirement ID → the function specs naming it. A design that cannot be read simply lists none. */
    private Map<String, List<Map<String, Object>>> functions(String designJson) {
        Map<String, List<Map<String, Object>>> result = new HashMap<>();
        try {
            for (JsonNode spec : json.readTree(designJson).path("FUNCTION_SPECS")) {
                for (JsonNode requirement : spec.path("REQUIREMENT_IDS")) {
                    var item = new LinkedHashMap<String, Object>();
                    item.put("FUNCTION_ID", spec.path("FUNCTION_ID").asText());
                    item.put("NAME", spec.path("NAME").asText());
                    result.computeIfAbsent(requirement.asText(), key -> new ArrayList<>()).add(item);
                }
            }
        } catch (Exception ignored) { /* unreadable design: no function links */ }
        return result;
    }

    private static boolean reflected(Evidence evidence, Map<String, Design> designs) {
        Design design = designs.get(evidence.programId());
        return design != null && "CONFIRMED".equals(design.status()) && design.functionsByRequirement().containsKey(evidence.requirementId());
    }

    static String state(String requirementId, Loaded data) {
        var evidence = data.evidence().getOrDefault(requirementId, List.of());
        if (evidence.stream().anyMatch(item -> reflected(item, data.designs()))) return DESIGN_REFLECTED;
        if (!evidence.isEmpty()) return PROGRAM;
        return data.groups().containsKey(requirementId) ? GROUP_ONLY : UNLINKED;
    }

    private static boolean reviewRequired(String requirementId, Loaded data) {
        long current = data.revisions().getOrDefault(requirementId, 0L);
        return data.evidence().getOrDefault(requirementId, List.of()).stream().anyMatch(item -> ProgramReviewStatus.stale(current, item.snapshotRevision()));
    }

    /** One entry per requirement of the project, computed with four queries (not one call per requirement). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> summary(String project) {
        Loaded data = load(project(project), null);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (String id : data.revisions().keySet()) {
            var row = new LinkedHashMap<String, Object>();
            row.put("REQUIREMENT_ID", id);
            row.put("TRACE_STATE", state(id, data));
            row.put("GROUP_COUNT", data.groups().getOrDefault(id, List.of()).size());
            row.put("PROGRAM_COUNT", data.evidence().getOrDefault(id, List.of()).stream().map(Evidence::programId).distinct().count());
            row.put("REVIEW_REQUIRED_YN", reviewRequired(id, data) ? "Y" : "N");
            rows.add(row);
        }
        return rows;
    }

    /** The requirement must belong to the given project: asking for another project's requirement answers 404. */
    @Transactional(readOnly = true)
    public Map<String, Object> trace(String project, String requirementId) {
        Loaded data = load(project(project), requirementId);
        if (!data.revisions().containsKey(requirementId)) throw status(HttpStatus.NOT_FOUND, "요구사항을 찾을 수 없습니다.");
        var result = new LinkedHashMap<String, Object>();
        result.put("REQUIREMENT_ID", requirementId);
        result.put("REQUIREMENT_REVISION", data.revisions().get(requirementId));
        result.put("TRACE_STATE", state(requirementId, data));
        result.put("REVIEW_REQUIRED_YN", reviewRequired(requirementId, data) ? "Y" : "N");
        result.put("GROUPS", data.groups().getOrDefault(requirementId, List.of()).stream().map(group -> {
            var item = new LinkedHashMap<String, Object>();
            item.put("REQUIREMENT_GROUP_ID", group.id()); item.put("REQUIREMENT_GROUP_NAME", group.name()); item.put("GROUP_STATUS", group.status());
            return (Map<String, Object>) item;
        }).toList());
        long current = data.revisions().get(requirementId);
        result.put("PROGRAMS", data.evidence().getOrDefault(requirementId, List.of()).stream().map(evidence -> {
            var item = new LinkedHashMap<String, Object>();
            item.put("PROGRAM_ID", evidence.programId()); item.put("PROGRAM_NAME", evidence.programName()); item.put("SOURCE_GROUP_ID", evidence.sourceGroupId());
            item.put("SNAPSHOT_REVISION", evidence.snapshotRevision());
            item.put("REVIEW_REQUIRED_YN", ProgramReviewStatus.stale(current, evidence.snapshotRevision()) ? "Y" : "N");
            item.put("REFLECTED_YN", reflected(evidence, data.designs()) ? "Y" : "N");
            Design design = data.designs().get(evidence.programId());
            if (design == null) item.put("DESIGN", null);
            else {
                var d = new LinkedHashMap<String, Object>();
                d.put("DESIGN_STATUS", design.status()); d.put("DESIGN_VERSION", design.version());
                d.put("FUNCTIONS", design.functionsByRequirement().getOrDefault(requirementId, List.of()));
                item.put("DESIGN", d);
            }
            return (Map<String, Object>) item;
        }).toList());
        return result;
    }
}
