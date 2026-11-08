package com.caron.basekit.core.documentnumber;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

@Repository
class DocumentNumberMapper {
    private final JdbcTemplate jdbc;

    DocumentNumberMapper(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    private static OffsetDateTime offset(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        Object value = rs.getObject(column);
        if (value instanceof OffsetDateTime dateTime) return dateTime;
        if (value instanceof Timestamp timestamp) return timestamp.toInstant().atOffset(java.time.ZoneOffset.UTC);
        return null;
    }

    private static final RowMapper<DocumentNumberRuleData> RULE = (rs, row) -> new DocumentNumberRuleData(
            rs.getString("RULE_KEY"), rs.getInt("RULE_VERSION"), rs.getString("RULE_NAME"), rs.getString("PREFIX"),
            rs.getString("DATE_FORMAT"), rs.getInt("SEQUENCE_LENGTH"), rs.getLong("START_VALUE"),
            rs.getLong("INCREMENT_VALUE"), rs.getString("RESET_CYCLE"), rs.getString("SCOPE_TYPE"),
            rs.getString("USE_YN"), rs.getString("DESCRIPTION"), rs.getLong("CURRENT_VALUE"),
            offset(rs, "REG_DT"), rs.getString("REG_BY"), offset(rs, "MOD_DT"), rs.getString("MOD_BY"));

    private static final RowMapper<DocumentNumberIssueData> ISSUE = (rs, row) -> new DocumentNumberIssueData(
            rs.getString("ISSUE_ID"), rs.getString("RULE_KEY"), rs.getInt("RULE_VERSION"), rs.getString("SCOPE_KEY"),
            rs.getString("PERIOD_KEY"), rs.getLong("SEQUENCE_VALUE"), rs.getString("DOCUMENT_NUMBER"),
            rs.getString("IDEMPOTENCY_KEY"), rs.getString("ISSUE_STATUS"), rs.getString("BUSINESS_REF"),
            offset(rs, "REG_DT"), offset(rs, "MOD_DT"));

    List<DocumentNumberRuleData> findRules(String keyword, String useYn) {
        return jdbc.query("""
                SELECT R.*, COALESCE((SELECT MAX(C.LAST_VALUE) FROM BKDOCSEQ_COUNTER C
                  WHERE C.RULE_KEY=R.RULE_KEY AND C.RULE_VERSION=R.RULE_VERSION), 0) CURRENT_VALUE
                FROM BKDOCSEQ_RULE R
                WHERE (? IS NULL OR LOWER(R.RULE_KEY) LIKE ? OR LOWER(R.RULE_NAME) LIKE ?)
                  AND (? IS NULL OR R.USE_YN=?)
                ORDER BY R.RULE_KEY, R.RULE_VERSION DESC
                """, RULE, keyword, like(keyword), like(keyword), useYn, useYn);
    }

    DocumentNumberRuleData findRule(String key, Integer version) {
        List<DocumentNumberRuleData> rows = jdbc.query("""
                SELECT R.*, COALESCE((SELECT MAX(C.LAST_VALUE) FROM BKDOCSEQ_COUNTER C
                  WHERE C.RULE_KEY=R.RULE_KEY AND C.RULE_VERSION=R.RULE_VERSION), 0) CURRENT_VALUE
                FROM BKDOCSEQ_RULE R WHERE R.RULE_KEY=? AND (? IS NULL OR R.RULE_VERSION=?)
                ORDER BY R.RULE_VERSION DESC
                """, RULE, key, version, version);
        return rows.stream().findFirst().orElse(null);
    }

    DocumentNumberRuleData lockRule(String key, Integer version) {
        List<DocumentNumberRuleData> rows = jdbc.query("""
                SELECT R.*, 0 CURRENT_VALUE FROM BKDOCSEQ_RULE R
                WHERE R.RULE_KEY=?
                ORDER BY R.RULE_VERSION DESC FOR UPDATE
                """, RULE, key);
        return rows.stream().filter(row -> version == null || row.RULE_VERSION().equals(version)).findFirst().orElse(null);
    }

    Integer latestVersion(String key) {
        List<Integer> result = jdbc.query("SELECT MAX(RULE_VERSION) FROM BKDOCSEQ_RULE WHERE RULE_KEY=?", (rs, n) -> {
            int value = rs.getInt(1); return rs.wasNull() ? null : value;
        }, key);
        return result.isEmpty() ? null : result.getFirst();
    }

    void insertRule(DocumentNumberRuleSaveRequest request, int version, String actor) {
        jdbc.update("""
                INSERT INTO BKDOCSEQ_RULE (RULE_KEY,RULE_VERSION,RULE_NAME,PREFIX,DATE_FORMAT,SEQUENCE_LENGTH,
                  START_VALUE,INCREMENT_VALUE,RESET_CYCLE,SCOPE_TYPE,USE_YN,DESCRIPTION,REG_BY,MOD_BY)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """, request.RULE_KEY(), version, request.RULE_NAME().trim(), request.PREFIX().trim(),
                request.DATE_FORMAT(), request.SEQUENCE_LENGTH(), request.START_VALUE(), request.INCREMENT_VALUE(),
                request.RESET_CYCLE(), request.SCOPE_TYPE(), request.USE_YN(), trim(request.DESCRIPTION()), actor, actor);
    }

    int issueCount(String key, int version) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM BKDOCSEQ_ISSUE WHERE RULE_KEY=? AND RULE_VERSION=?",
                Integer.class, key, version);
    }

    void updateRule(String key, int version, DocumentNumberRuleSaveRequest request, String actor) {
        jdbc.update("""
                UPDATE BKDOCSEQ_RULE SET RULE_NAME=?, PREFIX=?, DATE_FORMAT=?, SEQUENCE_LENGTH=?, START_VALUE=?,
                  INCREMENT_VALUE=?, RESET_CYCLE=?, SCOPE_TYPE=?, USE_YN=?, DESCRIPTION=?, MOD_DT=CURRENT_TIMESTAMP, MOD_BY=?
                WHERE RULE_KEY=? AND RULE_VERSION=?
                """, request.RULE_NAME().trim(), request.PREFIX().trim(), request.DATE_FORMAT(), request.SEQUENCE_LENGTH(),
                request.START_VALUE(), request.INCREMENT_VALUE(), request.RESET_CYCLE(), request.SCOPE_TYPE(),
                request.USE_YN(), trim(request.DESCRIPTION()), actor, key, version);
    }

    void disableOtherVersions(String key, int version, String actor) {
        jdbc.update("UPDATE BKDOCSEQ_RULE SET USE_YN='N', MOD_DT=CURRENT_TIMESTAMP, MOD_BY=? WHERE RULE_KEY=? AND RULE_VERSION<>? AND USE_YN='Y'",
                actor, key, version);
    }

    Long lastValue(String key, int version, String scopeKey, String periodKey) {
        List<Long> values = jdbc.query("SELECT LAST_VALUE FROM BKDOCSEQ_COUNTER WHERE RULE_KEY=? AND RULE_VERSION=? AND SCOPE_KEY=? AND PERIOD_KEY=?",
                (rs, n) -> rs.getLong(1), key, version, scopeKey, periodKey);
        return values.isEmpty() ? null : values.getFirst();
    }

    java.time.ZonedDateTime databaseNow() {
        Timestamp timestamp = jdbc.queryForObject("SELECT CURRENT_TIMESTAMP", Timestamp.class);
        return timestamp.toInstant().atZone(ZoneId.of("Asia/Seoul"));
    }

    void insertCounter(String key, int version, String scopeKey, String periodKey, long lastValue) {
        jdbc.update("INSERT INTO BKDOCSEQ_COUNTER (RULE_KEY,RULE_VERSION,SCOPE_KEY,PERIOD_KEY,LAST_VALUE) VALUES (?,?,?,?,?)",
                key, version, scopeKey, periodKey, lastValue);
    }

    void updateCounter(String key, int version, String scopeKey, String periodKey, long lastValue) {
        jdbc.update("UPDATE BKDOCSEQ_COUNTER SET LAST_VALUE=?, MOD_DT=CURRENT_TIMESTAMP WHERE RULE_KEY=? AND RULE_VERSION=? AND SCOPE_KEY=? AND PERIOD_KEY=?",
                lastValue, key, version, scopeKey, periodKey);
    }

    void insertIssue(DocumentNumberIssueData issue, String fingerprint) {
        jdbc.update("""
                INSERT INTO BKDOCSEQ_ISSUE (ISSUE_ID,RULE_KEY,RULE_VERSION,SCOPE_KEY,PERIOD_KEY,SEQUENCE_VALUE,
                  DOCUMENT_NUMBER,IDEMPOTENCY_KEY,REQUEST_FINGERPRINT,ISSUE_STATUS,BUSINESS_REF)
                VALUES (?,?,?,?,?,?,?,?,?,'RESERVED',?)
                """, issue.ISSUE_ID(), issue.RULE_KEY(), issue.RULE_VERSION(), issue.SCOPE_KEY(), issue.PERIOD_KEY(),
                issue.SEQUENCE_VALUE(), issue.DOCUMENT_NUMBER(), issue.IDEMPOTENCY_KEY(), fingerprint, issue.BUSINESS_REF());
    }

    DocumentNumberIssueData findByIdempotency(String key, String idempotencyKey) {
        List<DocumentNumberIssueData> rows = jdbc.query("SELECT * FROM BKDOCSEQ_ISSUE WHERE RULE_KEY=? AND IDEMPOTENCY_KEY=?",
                ISSUE, key, idempotencyKey);
        return rows.stream().findFirst().orElse(null);
    }

    String requestFingerprint(String key, String idempotencyKey) {
        List<String> rows = jdbc.query("SELECT REQUEST_FINGERPRINT FROM BKDOCSEQ_ISSUE WHERE RULE_KEY=? AND IDEMPOTENCY_KEY=?",
                (rs, n) -> rs.getString(1), key, idempotencyKey);
        return rows.stream().findFirst().orElse(null);
    }

    void updateIssueStatus(String id, String status, String businessRef) {
        jdbc.update("UPDATE BKDOCSEQ_ISSUE SET ISSUE_STATUS=?, BUSINESS_REF=COALESCE(?, BUSINESS_REF), MOD_DT=CURRENT_TIMESTAMP WHERE ISSUE_ID=?",
                status, businessRef, id);
    }

    DocumentNumberIssueData findIssue(String id) {
        List<DocumentNumberIssueData> rows = jdbc.query("SELECT * FROM BKDOCSEQ_ISSUE WHERE ISSUE_ID=?", ISSUE, id);
        return rows.stream().findFirst().orElse(null);
    }

    List<DocumentNumberIssueData> findHistory(String key, int version, String keyword, int limit) {
        return jdbc.query("""
                SELECT * FROM BKDOCSEQ_ISSUE WHERE RULE_KEY=? AND RULE_VERSION=?
                  AND (? IS NULL OR LOWER(DOCUMENT_NUMBER) LIKE ? OR LOWER(COALESCE(BUSINESS_REF,'')) LIKE ?)
                ORDER BY REG_DT DESC, ISSUE_ID DESC LIMIT ?
                """, ISSUE, key, version, keyword, like(keyword), like(keyword), limit);
    }

    private static String like(String value) { return value == null ? null : "%" + value.toLowerCase() + "%"; }
    private static String trim(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
