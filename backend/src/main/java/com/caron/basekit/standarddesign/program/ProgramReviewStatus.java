package com.caron.basekit.standarddesign.program;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * "Review needed" flag of a program, computed on read (nothing is stored and no status changes by itself): a requirement of the
 * program's evidence has a newer revision than the one the program was adopted with. Evidence without a recorded revision
 * (older data) cannot be judged and never counts. Attachment-only changes also raise the requirement revision, so they count too.
 */
@Component
public class ProgramReviewStatus {
    private static final String STALE_SQL = """
        SELECT E.PROGRAM_ID, E.REQUIREMENT_ID FROM BSDGPREQ E
        JOIN BSDGPROG P ON P.PROGRAM_ID = E.PROGRAM_ID
        JOIN BSDRREQ R ON R.REQUIREMENT_ID = E.REQUIREMENT_ID
        WHERE %s AND E.REQUIREMENT_REVISION IS NOT NULL AND R.REQUIREMENT_REVISION > E.REQUIREMENT_REVISION
        ORDER BY E.PROGRAM_ID, E.REQUIREMENT_ID""";
    private final JdbcTemplate jdbc;

    public ProgramReviewStatus(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** The single rule shared by every screen that shows the flag. */
    public static boolean stale(long currentRevision, Long snapshotRevision) { return snapshotRevision != null && currentRevision > snapshotRevision; }

    /** Program ID → requirement IDs changed since adoption, for the whole project (one query). Programs without any are absent. */
    public Map<String, List<String>> staleByProgram(String project) {
        var result = new LinkedHashMap<String, List<String>>();
        jdbc.query(STALE_SQL.formatted("P.PROJECT_ID = ?"), rs -> { result.computeIfAbsent(rs.getString(1), key -> new ArrayList<>()).add(rs.getString(2)); }, project);
        return result;
    }

    public List<String> staleOf(String programId) {
        return jdbc.queryForList(STALE_SQL.formatted("E.PROGRAM_ID = ?"), String.class, programId).stream().distinct().toList();
    }

    /** Adds the two keys every program response carries. */
    public static Map<String, Object> mark(Map<String, Object> program, List<String> staleRequirementIds) {
        program.put("REVIEW_REQUIRED_YN", staleRequirementIds.isEmpty() ? "N" : "Y");
        program.put("STALE_REQUIREMENT_IDS", staleRequirementIds);
        return program;
    }
}
