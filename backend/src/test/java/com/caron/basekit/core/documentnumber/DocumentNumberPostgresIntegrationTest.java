package com.caron.basekit.core.documentnumber;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.HashSet;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/** Set BASEKIT_DB_URL/USERNAME/PASSWORD to a disposable PostgreSQL database before enabling. */
@SpringBootTest
@EnabledIfEnvironmentVariable(named = "BASEKIT_DB_URL", matches = "jdbc:postgresql:.+")
class DocumentNumberPostgresIntegrationTest {
    @Autowired DocumentNumberService service;
    @Autowired JdbcTemplate jdbc;

    @Test
    void concurrentIssuanceUsesPostgresRowLocksAndUniqueLedger() throws Exception {
        String key = "PG_IT_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        String prefix = key.substring(key.length() - 4);
        jdbc.update("""
                INSERT INTO BKDOCSEQ_RULE (RULE_KEY,RULE_VERSION,RULE_NAME,PREFIX,DATE_FORMAT,SEQUENCE_LENGTH,
                  START_VALUE,INCREMENT_VALUE,RESET_CYCLE,SCOPE_TYPE,USE_YN,REG_BY,MOD_BY)
                VALUES (?,1,'Postgres integration rule',?,'NONE',6,1,1,'NONE','GLOBAL','Y','test','test')
                """, key, prefix);
        int count = 16;
        var pool = Executors.newFixedThreadPool(count);
        var ready = new CountDownLatch(count);
        var start = new CountDownLatch(1);
        try {
            var futures = new java.util.ArrayList<java.util.concurrent.Future<DocumentNumberIssueData>>();
            for (int i = 0; i < count; i++) {
                final int request = i;
                futures.add(pool.submit(() -> {
                    ready.countDown(); start.await();
                    return service.reserve(key, 1, "GLOBAL", UUID.randomUUID().toString(), "payload-" + request, "PG-REF-" + request);
                }));
            }
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            var numbers = new HashSet<String>();
            for (var future : futures) numbers.add(future.get(30, TimeUnit.SECONDS).DOCUMENT_NUMBER());
            assertThat(numbers).hasSize(count);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM BKDOCSEQ_ISSUE WHERE RULE_KEY=?", Integer.class, key)).isEqualTo(count);
        } finally { pool.shutdownNow(); }
    }
}
