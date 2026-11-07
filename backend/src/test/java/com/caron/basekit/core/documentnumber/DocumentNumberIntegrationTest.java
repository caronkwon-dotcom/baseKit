package com.caron.basekit.core.documentnumber;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.HashSet;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DocumentNumberIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired DocumentNumberService service;
    @Autowired PlatformTransactionManager transactionManager;

    @Test
    void registersRuleAndPreviewDoesNotConsumeCounter() throws Exception {
        String key = key();
        String request = ruleJson(key, "YEAR", "YYYY", "GLOBAL");
        mockMvc.perform(post("/api/core/document-number-rules").contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.DATA.RULE_VERSION").value(1));
        String preview = ("{\"RULE_KEY\":\"%s\",\"RULE_VERSION\":1,\"SCOPE_KEY\":\"GLOBAL\"}").formatted(key);
        String first = mockMvc.perform(post("/api/core/document-number-rules/preview").contentType(MediaType.APPLICATION_JSON).content(preview))
                .andExpect(status().isOk()).andExpect(jsonPath("$.DATA.CONSUMES_NUMBER").value(false))
                .andReturn().getResponse().getContentAsString();
        String second = mockMvc.perform(post("/api/core/document-number-rules/preview").contentType(MediaType.APPLICATION_JSON).content(preview))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(first).contains("DOCUMENT_NUMBER");
        assertThat(second).contains("DOCUMENT_NUMBER");
        String draftPreview = "{\"RULE_KEY\":\"%s\",\"SCOPE_KEY\":\"GLOBAL\",\"DRAFT_RULE\":{\"RULE_KEY\":\"%s\",\"RULE_NAME\":\"Draft\",\"PREFIX\":\"DRF\",\"DATE_FORMAT\":\"YYYY\",\"SEQUENCE_LENGTH\":4,\"START_VALUE\":1,\"INCREMENT_VALUE\":1,\"RESET_CYCLE\":\"YEAR\",\"SCOPE_TYPE\":\"GLOBAL\",\"USE_YN\":\"Y\"}}".formatted(key, key);
        mockMvc.perform(post("/api/core/document-number-rules/preview").contentType(MediaType.APPLICATION_JSON).content(draftPreview))
                .andExpect(status().isOk()).andExpect(jsonPath("$.DATA.DOCUMENT_NUMBER").value(org.hamcrest.Matchers.startsWith("DRF-")))
                .andExpect(jsonPath("$.DATA.CONSUMES_NUMBER").value(false));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM BKDOCSEQ_COUNTER WHERE RULE_KEY=?", Integer.class, key)).isZero();
        mockMvc.perform(get("/api/core/document-number-rules/{key}", key))
                .andExpect(status().isOk()).andExpect(jsonPath("$.DATA.PREFIX").value(prefix(key)));
    }

    @Test
    void sameIdempotencyKeyReusesReservationAndDifferentPayloadConflicts() {
        String key = key(); createRule(key, "NONE", "NONE", "GLOBAL");
        String idem = UUID.randomUUID().toString();
        var first = service.reserve(key, 1, "GLOBAL", idem, "payload-a", "REF-1");
        var retry = service.reserve(key, 1, "GLOBAL", idem, "payload-a", "REF-1");
        assertThat(retry.DOCUMENT_NUMBER()).isEqualTo(first.DOCUMENT_NUMBER());
        assertThatThrownBy(() -> service.reserve(key, 1, "GLOBAL", idem, "payload-b", "REF-1"))
                .isInstanceOf(DocumentNumberConflictException.class);

        // A retry after activating a new version still resolves to the original reservation.
        jdbc.update("UPDATE BKDOCSEQ_RULE SET USE_YN='N' WHERE RULE_KEY=? AND RULE_VERSION=1", key);
        jdbc.update("""
                INSERT INTO BKDOCSEQ_RULE (RULE_KEY,RULE_VERSION,RULE_NAME,PREFIX,DATE_FORMAT,SEQUENCE_LENGTH,
                  START_VALUE,INCREMENT_VALUE,RESET_CYCLE,SCOPE_TYPE,USE_YN,REG_BY,MOD_BY)
                VALUES (?,2,'Integration Rule',?, 'NONE',4,1,1,'NONE','GLOBAL','Y','test','test')
                """, key, prefix(key) + "N");
        var versionRetry = service.reserve(key, 2, "GLOBAL", idem, "payload-a", "REF-1");
        assertThat(versionRetry.ISSUE_ID()).isEqualTo(first.ISSUE_ID());
        var other = service.reserve(key, 2, "GLOBAL", UUID.randomUUID().toString(), "payload-a", "REF-2");
        assertThat(other.DOCUMENT_NUMBER()).isNotEqualTo(first.DOCUMENT_NUMBER());
    }

    @Test
    void serializesConcurrentReservationsWithoutDuplicates() throws Exception {
        String key = key(); createRule(key, "NONE", "NONE", "GLOBAL");
        int count = 24;
        var pool = Executors.newFixedThreadPool(count);
        var start = new CountDownLatch(1);
        try {
            var futures = new java.util.ArrayList<java.util.concurrent.Future<DocumentNumberIssueData>>();
            for (int i = 0; i < count; i++) {
                final int request = i;
                futures.add(pool.submit(() -> {
                    start.await();
                    return service.reserve(key, 1, "GLOBAL", UUID.randomUUID().toString(), "payload-" + request, "REF-" + request);
                }));
            }
            start.countDown();
            var numbers = new HashSet<String>();
            for (var future : futures) numbers.add(future.get(30, TimeUnit.SECONDS).DOCUMENT_NUMBER());
            assertThat(numbers).hasSize(count);
        } finally { pool.shutdownNow(); }
    }

    @Test
    void reservationSurvivesBusinessRollbackAndRuleFormatBecomesImmutable() throws Exception {
        String key = key(); createRule(key, "NONE", "NONE", "GLOBAL");
        String idem = UUID.randomUUID().toString();
        var issue = service.reserve(key, 1, "GLOBAL", idem, "create-request", "REF-ROLLBACK");
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        assertThatThrownBy(() -> tx.executeWithoutResult(status -> {
            service.markCompleted(issue.ISSUE_ID(), "REF-ROLLBACK");
            throw new IllegalStateException("simulate business insert failure");
        })).isInstanceOf(IllegalStateException.class);
        assertThat(jdbc.queryForObject("SELECT ISSUE_STATUS FROM BKDOCSEQ_ISSUE WHERE ISSUE_ID=?", String.class, issue.ISSUE_ID())).isEqualTo("RESERVED");
        service.markAbandoned(issue.ISSUE_ID());
        var retry = service.reserve(key, 1, "GLOBAL", idem, "create-request", "REF-ROLLBACK");
        assertThat(retry.ISSUE_ID()).isEqualTo(issue.ISSUE_ID());
        assertThat(retry.DOCUMENT_NUMBER()).isEqualTo(issue.DOCUMENT_NUMBER());

        String changed = ruleJson(key, "NONE", "NONE", "GLOBAL").replace("\"PREFIX\":\"" + prefix(key) + "\"", "\"PREFIX\":\"NEW\"");
        mockMvc.perform(put("/api/core/document-number-rules/{key}/1", key).contentType(MediaType.APPLICATION_JSON).content(changed))
                .andExpect(status().isConflict());
        mockMvc.perform(get("/api/core/document-number-rules/{key}/1/issues", key))
                .andExpect(status().isOk()).andExpect(jsonPath("$.DATA.length()").value(1));
    }

    @Test
    void disablingRuleBlocksNewReservationButPreservesIdempotentRetry() throws Exception {
        String key = key(); createRule(key, "NONE", "NONE", "GLOBAL");
        String idem = UUID.randomUUID().toString();
        var issue = service.reserve(key, 1, "GLOBAL", idem, "same", "REF");
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                        "/api/core/document-number-rules/{key}/1/usage?USE_YN=N", key))
                .andExpect(status().isOk());
        assertThat(service.reserve(key, 1, "GLOBAL", idem, "same", "REF").DOCUMENT_NUMBER()).isEqualTo(issue.DOCUMENT_NUMBER());
        assertThatThrownBy(() -> service.reserve(key, 1, "GLOBAL", UUID.randomUUID().toString(), "new", "REF-2"))
                .isInstanceOf(DocumentNumberConflictException.class);
    }

    @Test
    void periodKeysRestartAtYearAndMonthBoundaries() {
        var beforeMonth = java.time.ZonedDateTime.parse("2026-01-31T23:59:59+09:00[Asia/Seoul]");
        var afterMonth = java.time.ZonedDateTime.parse("2026-02-01T00:00:00+09:00[Asia/Seoul]");
        assertThat(DocumentNumberAdminService.period("MONTH", beforeMonth)).isEqualTo("202601");
        assertThat(DocumentNumberAdminService.period("MONTH", afterMonth)).isEqualTo("202602");
        assertThat(DocumentNumberAdminService.period("YEAR", beforeMonth)).isEqualTo("2026");
        assertThat(DocumentNumberAdminService.period("NONE", afterMonth)).isEqualTo("ALL");
    }

    @Test
    void marksSuccessfulBusinessSaveCompleteInItsTransaction() {
        String key = key(); createRule(key, "NONE", "NONE", "GLOBAL");
        String idem = UUID.randomUUID().toString();
        var issue = service.reserve(key, 1, "GLOBAL", idem, "save", "BUSINESS-1");
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> service.markCompleted(issue.ISSUE_ID(), "BUSINESS-1"));
        assertThat(jdbc.queryForObject("SELECT ISSUE_STATUS FROM BKDOCSEQ_ISSUE WHERE ISSUE_ID=?", String.class, issue.ISSUE_ID())).isEqualTo("COMPLETED");
        assertThat(service.reserve(key, 1, "GLOBAL", idem, "save", "BUSINESS-1").ISSUE_STATUS()).isEqualTo("COMPLETED");
    }

    private void createRule(String key, String cycle, String dateFormat, String scope) {
        jdbc.update("""
                INSERT INTO BKDOCSEQ_RULE (RULE_KEY,RULE_VERSION,RULE_NAME,PREFIX,DATE_FORMAT,SEQUENCE_LENGTH,
                  START_VALUE,INCREMENT_VALUE,RESET_CYCLE,SCOPE_TYPE,USE_YN,REG_BY,MOD_BY)
                VALUES (?,1,'Integration Rule',?, ?,4,1,1,?,?, 'Y','test','test')
                """, key, prefix(key), dateFormat, cycle, scope);
    }

    private String ruleJson(String key, String cycle, String dateFormat, String scope) {
        return ("{\"RULE_KEY\":\"%s\",\"RULE_NAME\":\"Integration Rule\",\"PREFIX\":\"%s\",\"DATE_FORMAT\":\"%s\",\"SEQUENCE_LENGTH\":4,\"START_VALUE\":1,\"INCREMENT_VALUE\":1,\"RESET_CYCLE\":\"%s\",\"SCOPE_TYPE\":\"%s\",\"USE_YN\":\"Y\",\"DESCRIPTION\":\"test\"}")
                .formatted(key, prefix(key), dateFormat, cycle, scope);
    }

    private String key() { return "IT_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase(); }
    private String prefix(String key) { return key.substring(key.length() - 4); }
}
