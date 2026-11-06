package com.caron.basekit.standarddesign.schema;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Explicit PostgreSQL opt-in (BASEKIT_PG_PROJECT_REVIEW=true plus BASEKIT_DB_URL/USERNAME/PASSWORD of a throwaway database).
 * Starting the context applies Flyway V28; the test only reads the PostgreSQL catalog (obj_description / col_description).
 */
@SpringBootTest(properties = {"spring.datasource.url=${BASEKIT_DB_URL:jdbc:postgresql://localhost:5432/basekit}", "spring.datasource.username=${BASEKIT_DB_USERNAME:basekit}", "spring.datasource.password=${BASEKIT_DB_PASSWORD:}"})
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named = "BASEKIT_PG_PROJECT_REVIEW", matches = "true")
class SdTableCommentPostgresTest {
 @Autowired JdbcTemplate jdbc;

 @Test void tablesAndColumnsHaveComments() {
  List<String> noTable = jdbc.queryForList("SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = current_schema() AND c.relkind = 'r' AND c.relname LIKE 'bsd%' AND coalesce(obj_description(c.oid, 'pg_class'), '') = '' ORDER BY 1", String.class);
  assertEquals(List.of(), noTable, "tables without a comment");
  List<String> noColumn = jdbc.queryForList("SELECT c.relname || '.' || a.attname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped WHERE n.nspname = current_schema() AND c.relkind = 'r' AND c.relname LIKE 'bsd%' AND coalesce(col_description(c.oid, a.attnum), '') = '' ORDER BY 1", String.class);
  assertEquals(List.of(), noColumn, "columns without a comment");
 }
}
