package com.caron.basekit.core.documentnumber;

import org.flywaydb.core.Flyway;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class DocumentNumberMigrationTest {
    @Test
    void appliesV32AndItsDdlAndMenuSeedsCanBeReplayed() throws Exception {
        var source = new JdbcDataSource();
        source.setURL("jdbc:h2:mem:document-number-" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1");
        source.setUser("sa");
        Flyway flyway = Flyway.configure().dataSource(source).locations("classpath:db/migration").load();
        flyway.migrate();
        var jdbc = new JdbcTemplate(source);
        String sql = new ClassPathResource("db/migration/V32__document_number_management.sql")
                .getContentAsString(StandardCharsets.UTF_8);
        for (String command : sql.lines().filter(line -> !line.stripLeading().startsWith("--"))
                .reduce((left, right) -> left + "\n" + right).orElse("").split(";")) {
            if (!command.isBlank()) try (var connection = source.getConnection(); var statement = connection.createStatement()) {
                statement.execute(command);
            }
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM BSYPROG WHERE PROGRAM_KEY='DOC_NUMBER_MGMT'", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM BSYMENU WHERE MENU_KEY='SYS.DOC_NUMBER'", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE 'BKDOCSEQ_%'", Integer.class)).isEqualTo(3);
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("32");
    }
}
