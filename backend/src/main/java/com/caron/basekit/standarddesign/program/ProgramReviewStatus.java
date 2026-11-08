package com.caron.basekit.standarddesign.program;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * "Review needed" flag of a program, computed on read (nothing is stored and no status changes by itself): a requirement of the
 * program's evidence has a revision newer than the one the program was adopted with, judged on the requirement history (BSDRRHIS):
 * a revision counts only when its event is a content change. Attachment-only revisions (ATTACHMENT_ADDED / ATTACHMENT_REMOVED) do
 * not. Evidence without a recorded revision, and requirements without any history row after the snapshot, are never flagged.
 */
@Component
public class ProgramReviewStatus {
    /** History events that raise the revision without changing the requirement's content. */
    public static final String ATTACHMENT_EVENTS = "'ATTACHMENT_ADDED','ATTACHMENT_REMOVED'";
    private static final String STALE_SQL = """
        SELECT E.PROGRAM_ID, E.REQUIREMENT_ID FROM BSDGPREQ E
        JOIN BSDGPROG P ON P.PROGRAM_ID = E.PROGRAM_ID
        WHERE %s AND E.REQUIREMENT_REVISION IS NOT NULL AND EXISTS (
            SELECT 1 FROM BSDRRHIS H WHERE H.REQUIREMENT_ID = E.REQUIREMENT_ID
            AND H.REQUIREMENT_REVISION > E.REQUIREMENT_REVISION AND H.EVENT_TYPE NOT IN (""" + ATTACHMENT_EVENTS + """
        ))
        ORDER BY E.PROGRAM_ID, E.REQUIREMENT_ID""";
    private final JdbcTemplate jdbc;

    public ProgramReviewStatus(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /**
     * The single rule shared by every screen that shows the flag. {@code latestContentRevision} is the newest history revision of the
     * requirement that is not attachment-only (null when there is none).
     */
    public static boolean stale(Long latestContentRevision, Long snapshotRevision) {
        return snapshotRevision != null && latestContentRevision != null && latestContentRevision > snapshotRevision;
    }

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
