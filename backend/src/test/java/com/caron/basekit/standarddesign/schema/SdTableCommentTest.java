package com.caron.basekit.standarddesign.schema;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

/** ADR 017: every Standard Design table (BSD*) and column carries a comment. A new table or column without COMMENT ON fails here. */
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:sd-comments;MODE=PostgreSQL;DATABASE_TO_UPPER=TRUE;DB_CLOSE_DELAY=-1")
@ActiveProfiles("test")
class SdTableCommentTest {
 @Autowired JdbcTemplate jdbc;

 @Test void everySdTableHasLogicalNameFullNameAndDescription() {
  List<String> tables = jdbc.queryForList("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME LIKE 'BSD%' ORDER BY TABLE_NAME", String.class);
  assertTrue(tables.contains("BSDPROJ") && tables.size() >= 31, "SD tables found: " + tables.size());
  for (String table : tables) {
   String remarks = jdbc.queryForObject("SELECT REMARKS FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = ?", String.class, table);
   assertNotNull(remarks, table + " has no table comment");
   String[] parts = remarks.split(" \\| ");
   assertEquals(3, parts.length, table + " comment must be '논리명 | Full Name | 설명': " + remarks);
   for (String part : parts) assertFalse(part.isBlank(), table + " comment has an empty part: " + remarks);
   assertTrue(parts[1].startsWith("BaseKit Standard Design "), table + " Full Name: " + parts[1]);
  }
 }

 @Test void everySdColumnHasAComment() {
  List<String> missing = jdbc.queryForList("SELECT TABLE_NAME || '.' || COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME LIKE 'BSD%' AND (REMARKS IS NULL OR TRIM(REMARKS) = '') ORDER BY 1", String.class);
  assertEquals(List.of(), missing, "columns without a comment");
 }

 @Test void commentsMatchTheMeaningOfWellKnownColumns() {
  assertTrue(jdbc.queryForObject("SELECT REMARKS FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'BSDPROJ' AND COLUMN_NAME = 'PROJECT_NAME'", String.class).startsWith("프로젝트명"));
  assertTrue(jdbc.queryForObject("SELECT REMARKS FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'BSDPROJ'", String.class).startsWith("프로젝트 | BaseKit Standard Design Project | "));
 }
}
